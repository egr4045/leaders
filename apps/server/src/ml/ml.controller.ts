import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { MlService } from './ml.service.js';

/**
 * HTTP-контракт для ML-коробки (см. docs/ml-box-contract.md).
 * Коробка САМА опрашивает VPS (исходящие запросы) — входящий туннель не обязателен.
 */
@Controller('ml')
export class MlController {
  constructor(private readonly ml: MlService) {}

  private auth(header?: string) {
    const token = process.env.ML_BOX_TOKEN;
    if (!token || header !== `Bearer ${token}`) {
      throw new UnauthorizedException('Нужен Authorization: Bearer <ML_BOX_TOKEN>');
    }
  }

  @Get('jobs')
  async jobs(@Headers('authorization') auth: string, @Query('max') max?: string) {
    this.auth(auth);
    const jobs = await this.ml.pullJobs(Math.min(10, Number(max) || 3));
    return { jobs };
  }

  @Post('jobs/:id/result')
  async result(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: { dataBase64: string; ext: string },
  ) {
    this.auth(auth);
    if (!body?.dataBase64 || !body?.ext) throw new Error('Нужны dataBase64 и ext');
    await this.ml.completeJob(id, Buffer.from(body.dataBase64, 'base64'), body.ext);
    return { ok: true };
  }

  @Post('jobs/:id/fail')
  async fail(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: { error?: string },
  ) {
    this.auth(auth);
    await this.ml.failJob(id, body?.error ?? 'unknown');
    return { ok: true };
  }
}
