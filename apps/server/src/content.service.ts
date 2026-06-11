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
    const dir = process.env.CONTENT_DIR ?? path.resolve(process.cwd(), '../../content');
    this._content = loadContent(dir);
    this.logger.log(
      `Контент загружен: стран ${this._content.countries.size}, статусов ${this._content.statuses.size}, квестов ${this._content.quests.size}`,
    );
  }
}
