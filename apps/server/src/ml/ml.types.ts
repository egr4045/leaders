/** Задание на генерацию ассета для ML-коробки (раздел 10 спеки). */
export interface MlJob {
  id: string;
  type: 'tts' | 'image';
  priority: 'high' | 'normal';
  payload: {
    /** для tts: текст диктора */
    text?: string;
    /** для image: промпт картинки-вставки */
    prompt?: string;
    /** подсказка голоса/стиля (свободная строка, интерпретирует ML-коробка) */
    style?: string;
    /** для per-line TTS: индекс строки новостей */
    lineIndex?: number;
    /** для pre-render: детерминированный ключ файла (pr_{cardId}_{choiceIdx}_{kind}) */
    prerenderKey?: string;
  };
  /** контекст для маршрутизации результата */
  roomCode: string;
  year: number;
  countryId: string;
  createdAt: number;
}

export type MlJobStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface MlJobDone {
  job: MlJob;
  /** URL ассета относительно корня сайта, например /assets/<id>.wav */
  assetUrl: string;
}
