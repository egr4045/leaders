import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../redis.service.js';
import type { MlJob, MlJobDone, MlJobStatus } from './ml.types.js';

const Q_HIGH = 'mlq:high';
const Q_NORMAL = 'mlq:normal';
const JOB_KEY = (id: string) => `mlq:job:${id}`;
const JOB_TTL = 60 * 60 * 6;

/**
 * Очередь генерации ассетов (раздел 10).
 * Реальная ML-коробка забирает задания по HTTP (см. docs/ml-box-contract.md).
 * В mock-режиме (ML_MOCK != '0') ассеты генерируются заглушками мгновенно —
 * игра полностью работает без ML-коробки.
 */
@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  readonly assetDir = process.env.ASSET_DIR ?? path.resolve(process.cwd(), '../../assets-cache');
  private onDoneHandlers: ((done: MlJobDone) => void)[] = [];

  constructor(private readonly redis: RedisService) {
    fs.mkdirSync(this.assetDir, { recursive: true });
  }

  get mockMode(): boolean {
    return process.env.ML_MOCK !== '0';
  }

  onDone(handler: (done: MlJobDone) => void) {
    this.onDoneHandlers.push(handler);
  }

  async enqueue(partial: Omit<MlJob, 'id' | 'createdAt'>): Promise<MlJob> {
    const job: MlJob = { ...partial, id: randomUUID(), createdAt: Date.now() };
    if (this.mockMode) {
      // мгновенная заглушка — индустриальный фолбэк по разделу 10
      setTimeout(() => this.mockResolve(job), 50);
      return job;
    }
    await this.redis.client
      .multi()
      .hset(JOB_KEY(job.id), { status: 'pending' satisfies MlJobStatus, job: JSON.stringify(job) })
      .expire(JOB_KEY(job.id), JOB_TTL)
      .lpush(job.priority === 'high' ? Q_HIGH : Q_NORMAL, job.id)
      .exec();
    return job;
  }

  /** ML-коробка забирает задания (приоритетные — первыми). */
  async pullJobs(max: number): Promise<MlJob[]> {
    const jobs: MlJob[] = [];
    for (const q of [Q_HIGH, Q_NORMAL]) {
      while (jobs.length < max) {
        const id = await this.redis.client.rpop(q);
        if (!id) break;
        const raw = await this.redis.client.hget(JOB_KEY(id), 'job');
        if (!raw) continue;
        await this.redis.client.hset(JOB_KEY(id), 'status', 'processing' satisfies MlJobStatus);
        jobs.push(JSON.parse(raw));
      }
    }
    return jobs;
  }

  async completeJob(id: string, data: Buffer, ext: string): Promise<void> {
    const raw = await this.redis.client.hget(JOB_KEY(id), 'job');
    if (!raw) throw new Error('Неизвестное задание');
    const job: MlJob = JSON.parse(raw);
    const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
    const file = `${id}.${safeExt}`;
    fs.writeFileSync(path.join(this.assetDir, file), data);
    await this.redis.client.hset(JOB_KEY(id), 'status', 'done' satisfies MlJobStatus, 'asset', file);
    this.emitDone({ job, assetUrl: `/assets/${file}` });
  }

  async failJob(id: string, error: string): Promise<void> {
    await this.redis.client.hset(JOB_KEY(id), 'status', 'failed' satisfies MlJobStatus, 'error', error.slice(0, 500));
    this.logger.warn(`ML-задание ${id} провалено: ${error}`);
  }

  private emitDone(done: MlJobDone) {
    for (const h of this.onDoneHandlers) {
      try {
        h(done);
      } catch (e) {
        this.logger.error(`onDone: ${(e as Error).message}`);
      }
    }
  }

  // ---------- mock-генераторы ----------

  private mockResolve(job: MlJob) {
    try {
      if (job.type === 'tts') {
        const seconds = Math.min(20, Math.max(2, (job.payload.text?.length ?? 50) / 25));
        const wav = makeMockSpeechWav(seconds);
        const file = `${job.id}.wav`;
        fs.writeFileSync(path.join(this.assetDir, file), wav);
        this.emitDone({ job, assetUrl: `/assets/${file}` });
      } else {
        const file = `${job.id}.svg`;
        fs.writeFileSync(path.join(this.assetDir, file), makeMockImageSvg(job.payload.prompt ?? ''));
        this.emitDone({ job, assetUrl: `/assets/${file}` });
      }
    } catch (e) {
      this.logger.error(`mock: ${(e as Error).message}`);
    }
  }
}

/**
 * Заглушка «речи»: бормотание из амплитудно-модулированного тона.
 * Достаточно, чтобы браузерный липсинк (AnalyserNode) шевелил рот.
 */
function makeMockSpeechWav(seconds: number): Buffer {
  const rate = 22050;
  const n = Math.floor(rate * seconds);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    // «слоги» ~4 в секунду + паузы между «фразами»
    const syllable = Math.max(0, Math.sin(2 * Math.PI * 4 * t)) ** 2;
    const phrase = Math.sin(2 * Math.PI * 0.25 * t) > -0.6 ? 1 : 0;
    const carrier = Math.sin(2 * Math.PI * 140 * t) * 0.6 + Math.sin(2 * Math.PI * 220 * t) * 0.4;
    const sample = carrier * syllable * phrase * 0.35;
    data.writeInt16LE(Math.round(sample * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function makeMockImageSvg(prompt: string): string {
  const esc = prompt.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
  <rect width="100%" height="100%" fill="#1e293b"/>
  <text x="50%" y="42%" fill="#f59e0b" font-size="28" font-family="sans-serif" text-anchor="middle">📷 [MOCK-КАРТИНКА]</text>
  <text x="50%" y="58%" fill="#cbd5e1" font-size="14" font-family="sans-serif" text-anchor="middle">${esc.slice(0, 80)}</text>
</svg>`;
}
