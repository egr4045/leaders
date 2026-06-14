import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { ContentService } from '../content.service.js';
import { RoomsService } from '../game/rooms.service.js';
import { MlService } from '../ml/ml.service.js';
import { AdminGuard } from './admin.guard.js';

/** Глубокий мёрж простых JSON-объектов (для патча tunables). */
function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const cur = out[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' && !Array.isArray(cur)) {
      out[k] = deepMerge(cur as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

interface EffectScore {
  cardId: string;
  deckCountry: string | null;
  speaker: string;
  situation: string;
  weight: number;
  once: boolean;
  requires: unknown;
  choices: {
    label: string;
    score: number;
    tags: string[];
    effects: unknown;
    newsLines?: { liberal: string; state: string };
    wonderFallbackName?: string;
    hasBuildWonder?: boolean;
  }[];
  maxScore: number;
  imageUrl: string | null;
  /** сырой объект карточки из JSON — для полноценного редактора */
  raw: Record<string, unknown>;
}

function scoreChoice(choice: Record<string, unknown>): { score: number; tags: string[] } {
  let score = 0;
  const tags: string[] = [];
  const effects = (choice.effects ?? {}) as Record<string, unknown>;
  const r = (effects.resources ?? {}) as Record<string, number>;
  const s = (effects.sectors ?? {}) as Record<string, number>;
  const pop = (effects.population ?? {}) as Record<string, number>;
  const dov = (effects.dovolstvo as number) ?? 0;

  if (r.gold) { score += (r.gold / 50) * 5; tags.push(`${r.gold > 0 ? '+' : ''}${r.gold} зол.`); }
  if (r.money) { score += r.money / 100; tags.push(`${r.money > 0 ? '+' : ''}${r.money} ден.`); }
  if (r.food) { score += r.food / 50; tags.push(`${r.food > 0 ? '+' : ''}${r.food} ед.`); }
  if (r.influence) { score += r.influence / 20; tags.push(`${r.influence > 0 ? '+' : ''}${r.influence} влин.`); }
  if (dov) {
    score += dov > 0 ? dov * 0.2 : dov * 0.3;
    tags.push(`${dov > 0 ? '+' : ''}${dov} дов.`);
  }
  for (const [k, v] of Object.entries(s)) {
    if (v) {
      score += v * 2;
      tags.push(`${v > 0 ? '+' : ''}${v} ${k}`);
    }
  }
  const totalPop = Object.values(pop).reduce((a, b) => a + b, 0);
  if (totalPop) { score += totalPop / 10; tags.push(`${totalPop > 0 ? '+' : ''}${totalPop} нас.`); }

  const addSt = (choice.addStatuses ?? []) as string[];
  if (addSt.length) { score += addSt.length * 3; tags.push(`+статус×${addSt.length}`); }
  if ((choice.delayed as unknown)) tags.push('откл.эфф');

  return { score: Math.round(score * 10) / 10, tags };
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  private readonly contentDir: string;
  private readonly assetDir: string;

  constructor(
    private readonly contentService: ContentService,
    private readonly rooms: RoomsService,
    private readonly ml: MlService,
  ) {
    this.contentDir = process.env.CONTENT_DIR ?? path.resolve(process.cwd(), '../../content');
    this.assetDir = process.env.ASSET_DIR ?? path.resolve(process.cwd(), '../../assets-cache');
  }

  // ---------- пре-рендер TTS ----------

  /** Список всех возможных ключей пре-рендера из текущего контента. */
  private buildPrerenderJobs(): { key: string; text: string }[] {
    const jobs: { key: string; text: string }[] = [];
    const advisorsDir = path.join(this.contentDir, 'advisors');
    if (!fs.existsSync(advisorsDir)) return jobs;
    for (const file of fs.readdirSync(advisorsDir).filter((f) => f.endsWith('.json'))) {
      const deck = JSON.parse(fs.readFileSync(path.join(advisorsDir, file), 'utf8')) as {
        cards: { id: string; speaker: string; choices: Record<string, unknown>[] }[];
      };
      for (const card of deck.cards ?? []) {
        (card.choices ?? []).forEach((ch, idx) => {
          const nl = ch.newsLines as { liberal: string; state: string } | undefined;
          if (nl) {
            jobs.push({ key: `pr_${card.id}_${idx}_liberal`, text: nl.liberal });
            jobs.push({ key: `pr_${card.id}_${idx}_state`, text: nl.state });
          } else {
            const label = (ch.label as string) ?? '';
            jobs.push({
              key: `pr_${card.id}_${idx}_default`,
              text: `${card.speaker} предложил — лидер решил: «${label}»`,
            });
          }
        });
      }
    }
    return jobs;
  }

  @Get('ml/prerender-status')
  getPrerenderStatus() {
    const all = this.buildPrerenderJobs();
    const { ready, total } = this.ml.getPrerenderCount(all.map((j) => j.key));
    return { ready, total };
  }

  @Post('ml/prerender-all')
  async prerenderAll(@Query('force') force?: string) {
    const all = this.buildPrerenderJobs();
    const forceAll = force === '1';
    let enqueued = 0;
    let skipped = 0;
    for (const { key, text } of all) {
      if (!forceAll && this.ml.getPrerenderUrl(key)) {
        skipped++;
        continue;
      }
      await this.ml.enqueue({
        type: 'tts',
        priority: 'normal',
        payload: { text, style: 'новостной диктор, ироничный', prerenderKey: key },
        roomCode: '__prerender__',
        year: 0,
        countryId: '__prerender__',
      });
      enqueued++;
    }
    return { ok: true, enqueued, skipped, total: all.length };
  }

  // ---------- сессии (комнаты) ----------

  @Get('rooms')
  getRooms() {
    return this.rooms.listRoomsForAdmin();
  }

  @Post('rooms/:code/kill')
  killRoom(@Param('code') code: string) {
    const ok = this.rooms.killRoomForAdmin(code);
    if (!ok) throw new HttpException('Комната не найдена', HttpStatus.NOT_FOUND);
    return { ok: true };
  }

  // ---------- страны ----------

  @Get('countries')
  getCountries() {
    const dir = path.join(this.contentDir, 'countries');
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Record<string, unknown>);
  }

  /** Полная замена страны (стартовые секторы/ресурсы/население/статусы и т.п.). */
  @Put('countries/:id')
  updateCountry(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const filePath = path.join(this.contentDir, 'countries', `${id}.json`);
    if (!fs.existsSync(filePath)) throw new HttpException('Страна не найдена', HttpStatus.NOT_FOUND);
    fs.writeFileSync(filePath, JSON.stringify({ ...body, id }, null, 2), 'utf8');
    return { ok: true };
  }

  // ---------- контент: горячая перезагрузка + tunables ----------

  /** Применить правки контента без рестарта (фича 4). */
  @Post('reload')
  reload() {
    const res = this.contentService.reloadContent();
    if (!res.ok) throw new HttpException(res.error ?? 'Ошибка валидации контента', HttpStatus.BAD_REQUEST);
    return { ok: true };
  }

  /** Текущие tunables (для редактора таймеров и т.п.). */
  @Get('tunables')
  getTunables() {
    return this.contentService.content.tunables;
  }

  /**
   * Патч tunables: глубокий мёрж в content/tunables.json + reload.
   * Если контент после правки не валиден — откатываем файл и возвращаем ошибку.
   */
  @Put('tunables')
  updateTunables(@Body() patch: Record<string, unknown>) {
    const filePath = path.join(this.contentDir, 'tunables.json');
    const original = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '{}';
    const current = JSON.parse(original) as Record<string, unknown>;
    const merged = deepMerge(current, patch ?? {});
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    const res = this.contentService.reloadContent();
    if (!res.ok) {
      fs.writeFileSync(filePath, original, 'utf8'); // откат
      this.contentService.reloadContent();
      throw new HttpException(res.error ?? 'Невалидные tunables', HttpStatus.BAD_REQUEST);
    }
    return { ok: true, tunables: this.contentService.content.tunables };
  }

  @Get('cards')
  getCards(): EffectScore[] {
    const results: EffectScore[] = [];
    const advisorsDir = path.join(this.contentDir, 'advisors');
    const files = fs.readdirSync(advisorsDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const deck = JSON.parse(fs.readFileSync(path.join(advisorsDir, file), 'utf8')) as {
        country: string | null;
        cards: Record<string, unknown>[];
      };
      for (const card of deck.cards) {
        const choices = ((card.choices ?? []) as Record<string, unknown>[]).map((c) => {
          const { score, tags } = scoreChoice(c);
          const effects = (c.effects ?? {}) as Record<string, unknown>;
          const hasBuildWonder = !!effects.buildWonder;
          return {
            label: (c.label as string) ?? '',
            score,
            tags,
            effects: c.effects ?? {},
            newsLines: c.newsLines as { liberal: string; state: string } | undefined,
            wonderFallbackName: c.wonderFallbackName as string | undefined,
            hasBuildWonder,
          };
        });
        const imgPath = path.join(this.assetDir, 'cards', `${card.id as string}.jpg`);
        const imageUrl = fs.existsSync(imgPath) ? `/media/cards/${card.id as string}.jpg` : null;
        results.push({
          cardId: card.id as string,
          deckCountry: deck.country,
          speaker: card.speaker as string,
          situation: card.situation as string,
          weight: (card.weight as number) ?? 1,
          once: Boolean(card.once),
          requires: card.requires ?? null,
          choices,
          maxScore: Math.max(...choices.map((c) => c.score)),
          imageUrl,
          raw: card,
        });
      }
    }
    return results.sort((a, b) => b.maxScore - a.maxScore);
  }

  @Get('statuses')
  getStatuses() {
    const statusesDir = path.join(this.contentDir, 'statuses');
    const results: unknown[] = [];
    if (fs.existsSync(statusesDir)) {
      for (const file of fs.readdirSync(statusesDir).filter((f) => f.endsWith('.json'))) {
        const data = JSON.parse(fs.readFileSync(path.join(statusesDir, file), 'utf8'));
        const statuses = Array.isArray(data) ? data : [data];
        results.push(...statuses);
      }
    }
    return results;
  }

  @Get('analysis')
  getAnalysis() {
    const cards = this.getCards();
    const topCards = cards.slice(0, 10).map((c) => ({
      id: c.cardId,
      country: c.deckCountry ?? 'общая',
      maxScore: c.maxScore,
      speaker: c.speaker,
    }));
    const weakCards = [...cards].sort((a, b) => a.maxScore - b.maxScore).slice(0, 10).map((c) => ({
      id: c.cardId,
      country: c.deckCountry ?? 'общая',
      maxScore: c.maxScore,
      speaker: c.speaker,
    }));
    const byCountry: Record<string, { count: number; avgScore: number }> = {};
    for (const c of cards) {
      const key = c.deckCountry ?? 'общая';
      const entry = (byCountry[key] ??= { count: 0, avgScore: 0 });
      entry.count++;
      entry.avgScore += c.maxScore;
    }
    for (const v of Object.values(byCountry)) v.avgScore = Math.round((v.avgScore / v.count) * 10) / 10;

    const heavyCards = cards.filter((c) => c.weight > 5).map((c) => ({ id: c.cardId, weight: c.weight }));
    const delayedCards = cards.filter((c) => c.choices.some((ch) => (ch.effects as Record<string, unknown>)?.delayed)).map((c) => c.cardId);
    const onceCards = cards.filter((c) => c.once).map((c) => c.cardId);

    return {
      topCards,
      weakCards,
      byCountry,
      heavyCards,
      delayedCards,
      onceCards,
      notes: [
        'Золото не инфлирует — карточки с gold > 100 за ход могут быть OP',
        'Умники → наука → уровень сектора; карты без downside сильные',
        'dovolstvo < 20 + мало siloviki = переворот; доводить население до этого опасно',
        'weight > 5 = слишком частые карты, стоит понизить',
        'once-карты особенно важны для баланса',
      ],
    };
  }

  @Put('cards/:id')
  updateCard(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const advisorsDir = path.join(this.contentDir, 'advisors');
    for (const file of fs.readdirSync(advisorsDir).filter((f) => f.endsWith('.json'))) {
      const filePath = path.join(advisorsDir, file);
      const deck = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
        country: string | null;
        cards: Record<string, unknown>[];
      };
      const idx = deck.cards.findIndex((c) => c.id === id);
      if (idx >= 0) {
        deck.cards[idx] = { ...deck.cards[idx], ...body, id };
        fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), 'utf8');
        // speaker входит в текст default-строки — инвалидируем все пре-рендеры карточки
        this.ml.deletePrerenders(`pr_${id}_`);
        return { ok: true };
      }
    }
    throw new HttpException('Карточка не найдена', HttpStatus.NOT_FOUND);
  }

  @Put('cards/:id/choices/:idx')
  updateCardChoice(
    @Param('id') id: string,
    @Param('idx') idxStr: string,
    @Body() body: Record<string, unknown>,
  ) {
    const idx = parseInt(idxStr, 10);
    const advisorsDir = path.join(this.contentDir, 'advisors');
    for (const file of fs.readdirSync(advisorsDir).filter((f) => f.endsWith('.json'))) {
      const filePath = path.join(advisorsDir, file);
      const deck = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
        country: string | null;
        cards: Record<string, unknown>[];
      };
      const cardIdx = deck.cards.findIndex((c) => c.id === id);
      if (cardIdx >= 0) {
        const card = deck.cards[cardIdx]!;
        const choices = ((card.choices ?? []) as Record<string, unknown>[]);
        if (idx < 0 || idx >= choices.length) {
          throw new HttpException('Вариант не найден', HttpStatus.NOT_FOUND);
        }
        choices[idx] = { ...choices[idx], ...body };
        deck.cards[cardIdx] = { ...card, choices };
        fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), 'utf8');
        // текст выбора изменился — удаляем пре-рендеры только этого варианта
        this.ml.deletePrerenders(`pr_${id}_${idx}_`);
        return { ok: true };
      }
    }
    throw new HttpException('Карточка не найдена', HttpStatus.NOT_FOUND);
  }

  /** Полная замена карточки сырым объектом (для JSON-редактора и структурного requires). */
  @Put('cards/:id/raw')
  replaceCard(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    if (!body || typeof body !== 'object' || !Array.isArray(body.choices)) {
      throw new HttpException('Нужен объект карточки с choices', HttpStatus.BAD_REQUEST);
    }
    const advisorsDir = path.join(this.contentDir, 'advisors');
    for (const file of fs.readdirSync(advisorsDir).filter((f) => f.endsWith('.json'))) {
      const filePath = path.join(advisorsDir, file);
      const deck = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
        country: string | null;
        cards: Record<string, unknown>[];
      };
      const idx = deck.cards.findIndex((c) => c.id === id);
      if (idx >= 0) {
        deck.cards[idx] = { ...body, id };
        fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), 'utf8');
        // raw-замена может поменять любой текст — удаляем все пре-рендеры карточки
        this.ml.deletePrerenders(`pr_${id}_`);
        return { ok: true };
      }
    }
    throw new HttpException('Карточка не найдена', HttpStatus.NOT_FOUND);
  }

  @Delete('cards/:id')
  deleteCard(@Param('id') id: string) {
    const advisorsDir = path.join(this.contentDir, 'advisors');
    for (const file of fs.readdirSync(advisorsDir).filter((f) => f.endsWith('.json'))) {
      const filePath = path.join(advisorsDir, file);
      const deck = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
        country: string | null;
        cards: Record<string, unknown>[];
      };
      const idx = deck.cards.findIndex((c) => c.id === id);
      if (idx >= 0) {
        deck.cards.splice(idx, 1);
        fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), 'utf8');
        return { ok: true };
      }
    }
    throw new HttpException('Карточка не найдена', HttpStatus.NOT_FOUND);
  }

  @Post('cards')
  createCard(@Body() body: Record<string, unknown>) {
    if (!body.id) throw new HttpException('id обязателен', HttpStatus.BAD_REQUEST);
    const deckCountry = (body.deckCountry as string | null) ?? null;
    const fileName = deckCountry ? `${deckCountry}.json` : 'common_deck.json';
    const filePath = path.join(this.contentDir, 'advisors', fileName);
    // персональная колода страны может ещё не существовать — создаём
    const deck: { country: string | null; cards: Record<string, unknown>[] } = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
      : { country: deckCountry, cards: [] };
    if (deck.cards.some((c) => c.id === body.id)) throw new HttpException('Карточка с таким id уже есть', HttpStatus.CONFLICT);
    const { deckCountry: _, ...cardData } = body;
    deck.cards.push(cardData);
    fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), 'utf8');
    // привязать персональную колоду к стране, иначе карты не попадут в её пул
    if (deckCountry) {
      const countryPath = path.join(this.contentDir, 'countries', `${deckCountry}.json`);
      if (fs.existsSync(countryPath)) {
        const c = JSON.parse(fs.readFileSync(countryPath, 'utf8')) as Record<string, unknown>;
        const ref = `advisors/${fileName}`;
        if (c.advisorsRef !== ref) {
          c.advisorsRef = ref;
          fs.writeFileSync(countryPath, JSON.stringify(c, null, 2), 'utf8');
        }
      }
    }
    return { ok: true };
  }

  @Put('statuses/:id')
  updateStatus(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const statusesDir = path.join(this.contentDir, 'statuses');
    for (const file of fs.readdirSync(statusesDir).filter((f) => f.endsWith('.json'))) {
      const filePath = path.join(statusesDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const arr: Record<string, unknown>[] = Array.isArray(data) ? data : [data];
      const idx = arr.findIndex((s) => s.id === id);
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...body, id };
        fs.writeFileSync(filePath, JSON.stringify(Array.isArray(data) ? arr : arr[0], null, 2), 'utf8');
        return { ok: true };
      }
    }
    throw new HttpException('Статус не найден', HttpStatus.NOT_FOUND);
  }

  /** Полная замена статуса сырым объектом (для структурного редактора). */
  @Put('statuses/:id/raw')
  replaceStatus(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    if (!body || typeof body !== 'object' || !body.type || !body.name) {
      throw new HttpException('Нужен объект статуса с name и type', HttpStatus.BAD_REQUEST);
    }
    const statusesDir = path.join(this.contentDir, 'statuses');
    for (const file of fs.readdirSync(statusesDir).filter((f) => f.endsWith('.json'))) {
      const filePath = path.join(statusesDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const arr: Record<string, unknown>[] = Array.isArray(data) ? data : [data];
      const idx = arr.findIndex((s) => s.id === id);
      if (idx >= 0) {
        arr[idx] = { ...body, id };
        fs.writeFileSync(filePath, JSON.stringify(Array.isArray(data) ? arr : arr[0], null, 2), 'utf8');
        return { ok: true };
      }
    }
    throw new HttpException('Статус не найден', HttpStatus.NOT_FOUND);
  }

  @Post('statuses')
  createStatus(@Body() body: Record<string, unknown>) {
    if (!body.id || !body.type) throw new HttpException('id и type обязательны', HttpStatus.BAD_REQUEST);
    const fileName = `${body.type as string}s.json`;
    const filePath = path.join(this.contentDir, 'statuses', fileName);
    const arr: Record<string, unknown>[] = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
      : [];
    if (arr.some((s) => s.id === body.id)) throw new HttpException('Статус с таким id уже есть', HttpStatus.CONFLICT);
    arr.push(body);
    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
    return { ok: true };
  }

  @Post('cards/:id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(
            process.env.ASSET_DIR ?? path.resolve(process.cwd(), '../../assets-cache'),
            'cards',
          );
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, _file, cb) => {
          cb(null, `${(req.params as Record<string, string>).id}.jpg`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        cb(null, file.mimetype.startsWith('image/'));
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new HttpException('Файл не получен', HttpStatus.BAD_REQUEST);
    return { ok: true, url: `/media/cards/${id}.jpg` };
  }
}
