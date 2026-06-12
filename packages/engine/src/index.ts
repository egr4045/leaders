/**
 * Игровое ядро: чистая детерминированная логика без сети и БД.
 * ВАЖНО: пакет импортируется ТОЛЬКО сервером — здесь живут скрытые
 * механики (Форбс, шпионаж), которые не должны попасть в бандл клиента.
 */
export const ENGINE_VERSION = '0.1.0';

export * from './content/load.js';
export * from './rng.js';
export * from './state.js';
export * from './modifiers.js';
export * from './effects.js';
export * from './combo.js';
export * from './cards.js';
export * from './tick.js';
export * from './forbes.js';
export * from './trade.js';
export * from './spy.js';
export * from './wonders.js';
export * from './auras.js';
export * from './war.js';
