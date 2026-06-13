import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'node:path';
import { loadContent, type GameContent } from '@leaders/engine';

/** Загружает и валидирует content/ один раз при старте сервера. */
@Injectable()
export class ContentService implements OnModuleInit {
  private readonly logger = new Logger(ContentService.name);
  private _content!: GameContent;

  get content(): GameContent {
    return this._content;
  }

  onModuleInit() {
    this._content = this.load();
    this.logger.log(
      `Контент загружен: стран ${this._content.countries.size}, статусов ${this._content.statuses.size}, квестов ${this._content.quests.size}`,
    );
  }

  private load(): GameContent {
    const dir = process.env.CONTENT_DIR ?? path.resolve(process.cwd(), '../../content');
    return loadContent(dir);
  }

  /**
   * Горячая перезагрузка контента с диска без рестарта (фича 4).
   * При успехе подменяет _content атомарно — работающие комнаты читают
   * его через геттер RoomsService.content. При ошибке валидации старый
   * контент остаётся живым, ошибка возвращается админке.
   */
  reloadContent(): { ok: boolean; error?: string } {
    try {
      const fresh = this.load();
      this._content = fresh;
      this.logger.log(
        `Контент перезагружен: стран ${fresh.countries.size}, статусов ${fresh.statuses.size}, квестов ${fresh.quests.size}`,
      );
      return { ok: true };
    } catch (e) {
      this.logger.warn(`Перезагрузка контента отклонена: ${(e as Error).message}`);
      return { ok: false, error: (e as Error).message };
    }
  }
}
