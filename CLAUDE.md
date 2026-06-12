# Leaders — карта проекта для AI-помощника

## Что это

Многопользовательская политическая игра на 6–9 человек. Игроки — лидеры государств, принимают карточные решения, торгуются, шпионят, выступают в ООН. Победитель определяется по Форбс-рейтингу.

Прод: **mygame-quiz.ru** (VPS). Systemd-сервис `leaders.service` запускает Node-сервер. Caddy раздаёт статику и проксирует WebSocket/API.

---

## Монорепо (pnpm workspaces)

```
/root/leaders/
├── apps/
│   ├── server/          — NestJS 10, WebSocket-сервер игры (@leaders/server)
│   └── web/             — React 18 + Vite + Tailwind CSS (@leaders/web)
├── packages/
│   ├── engine/          — чистая логика тика, без IO (@leaders/engine)
│   └── shared/          — общие типы, схемы Zod, события сокетов (@leaders/shared)
├── content/             — JSON-контент: страны, карточки, статусы, квесты
└── assets-cache/        — сгенерированные TTS/картинки диктора (runtime)
```

### Сборка и деплой

```bash
# Сборка (всегда в таком порядке — engine зависит от shared, server от engine)
pnpm --filter @leaders/shared build
pnpm --filter @leaders/engine build
pnpm --filter @leaders/server build
pnpm --filter @leaders/web build

# Перезапуск
systemctl restart leaders

# Проверка
systemctl is-active leaders
journalctl -u leaders -n 50
```

---

## Инфраструктура

### Caddy (`/etc/caddy/Caddyfile`)
- `/socket.io/*` → `host.docker.internal:3000` (игровой WS)
- `/api/*` → `host.docker.internal:3000` (REST, **strip `/api/` prefix**)
- `/media/*` → `host.docker.internal:3000` (ассеты TTS/изображений)
- `/livekit/*` → `livekit:7880` (LiveKit signal)
- `/assets/*` и всё остальное → `/srv/www` (Vite bundle)

**ВАЖНО**: Caddy срезает `/api/` перед отправкой в NestJS. Поэтому контроллеры объявлены как `@Controller('admin')`, а **не** `@Controller('api/admin')`.

### NestJS (порт 3000)
- Env: `ADMIN_SECRET=9135` (Bearer-токен для `/admin/*` эндпойнтов)
- Env: `PLAYERS_MIN=2` (для тестов; для продакшна убрать/поставить 6)
- Env: `LIVEKIT_KEY`, `LIVEKIT_SECRET`, `LIVEKIT_URL=wss://mygame-quiz.ru/livekit`
- Env: `ML_BOX_TOKEN` — токен ML-сервиса для TTS/изображений
- Статика ассетов: `/media/` → `../../assets-cache/`

### Redis
- Хранит состояния комнат с TTL 24ч
- Ключ: `room:<CODE>` → JSON
- Восстановление при рестарте: `rooms.restoreFromRedis()`

---

## Фазы игры

```
lobby → cabinet → un_summary → un_comments → un_debate → un_vote → results
         ↑___________________________ × N лет ___________________________↑
                                                                    → final
```

- `lobby` — выбор страны, видеозвонок
- `cabinet` — карточки советника, торговля, шпионаж, звонки 1-на-1
- `un_summary` — сводка новостей года
- `un_comments` — круговые комментарии (каждый по таймеру)
- `un_debate` — свободные дебаты (хост управляет таймером)
- `un_vote` — санкции/поддержка (10 влияния за голос)
- `results` — пересчёт тика, события года
- `final` — финальная таблица Форбс

---

## `@leaders/engine` — игровая логика

**Файлы:**
- `state.ts` — `CountryState`, `WorldState`, `createCountryState()`
- `tick.ts` — годовой пересчёт (производство → еда → инфляция → довольство → население → delayed → комбо → переворот)
- `effects.ts` — `applyEffectsOnce()`, `applyChoice()`
- `modifiers.ts` — `aggregateModifiers()`, `effectiveSector()`
- `spy.ts` — `resolveSpyAction()`, `spySuccessChance()`
- `combo.ts` — `recomputeStatuses()` (авто-присвоение режимов/технологий)
- `wonders.ts` — `buildWonder()`, бросает `WonderError` если чудо занято
- `forbes.ts` — `computeForbes()`
- `draw.ts` — `drawCard()` — выбор карточки из деки с учётом фильтров
- `content/load.ts` — `loadContent(dir)` — загружает и валидирует весь content/

### `CountryState` (полное состояние страны, никогда не уходит клиенту)
```ts
resources: { money, gold, food, influence }
population: { rabotyagi, umniki, siloviki, mediyshchiki, ministry }
sectors: { economy, science, army, smi, intel }  // базовые уровни (1-10)
dovolstvo: number  // 0-100
sciencePoints: number
moneyRate: number  // курс валюты (1 = старт, снижается от инфляции)
inflation: number  // инфляция прошлого года (доля, 0.03 = 3%)
activeStatuses: string[]
permanentModifiers: Modifiers[]
delayed: DelayedEntry[]  // отложенные эффекты через N лет
printedThisYear: number
repressionsThisYear: number
sanctions: number  // активные санкции ООН
wondersBuilt: string[]
sectorInvestment: Partial<Record<SectorKey, number>>  // бюджетный механик
```

### Порядок tick.ts (важен!)
1. Производство (деньги, еда, влияние, наука; содержание министров)
2. Наука → уровень сектора при достижении порога
3. Еда: потребление, голод, баланс
4. Инфляция, курс валюты
5. Довольство (еда, инфляция, СМИ, богатство)
6. Население (рост, голод, эмиграция умников от репрессий)
7. Отложенные эффекты (`delayed`)
8. Комбо-статусы (`recomputeStatuses`)
9. Переворот (если dovolstvo < порога)

---

## `@leaders/shared` — общие типы

**Ключевые файлы:**
- `snapshot.ts` — `RoomSnapshot`, `PrivateCountryView`, `PublicCountryView`, `YearProjection`
- `events.ts` — `SocketEvents` (имена всех WS-событий)
- `schemas/tunables.ts` — `TunablesSchema` (Zod, `.strict()`)
- `schemas/advisor.ts` — `AdvisorCard`, `AdvisorChoice`
- `schemas/status.ts` — `StatusSchema` (Zod, `.strict()` — добавлять поля сюда при расширении!)

**ВАЖНО**: схемы с `.strict()` → любое неизвестное поле в JSON → краш при загрузке контента. Если добавляешь поле в JSON-файл статуса/туниблса — сначала добавь его в схему.

### `SocketEvents` (events.ts)
c2s события (клиент → сервер, с ack):
- `room:create`, `room:join`, `room:leave`, `room:start`, `room:pick_country`
- `cabinet:choose`, `cabinet:ready`, `cabinet:set_budget`
- `spy:order`
- `trade:offer`, `trade:respond`, `trade:cancel`
- `un:comment_done`, `un:vote`, `forbes:declare`
- `video:token`, `call:invite`, `call:accept`, `call:decline`, `call:end`
- `room:host_continue`, `room:host_extend`

s2c события (сервер → клиент):
- `room:state` — полный снапшот (broadcast после каждого изменения)
- `game:announcement` — важное объявление поверх экрана
- `bot:log` — действия ботов в консоль браузера
- `call:incoming`, `call:started`, `call:ended`

---

## `@leaders/server` — NestJS-сервер

### Ключевые файлы:
- `game.gateway.ts` — все WebSocket-хендлеры (`@SubscribeMessage`)
- `game/rooms.service.ts` — вся игровая логика (комнаты, фазы, боты)
- `game/room.types.ts` — `RoomState`, `RoomPlayer`, `RoomTimers`
- `game/snapshot.builder.ts` — `buildSnapshot()` (собирает `RoomSnapshot` для конкретного игрока)
- `content.service.ts` — загружает `content/` через `loadContent()` при старте
- `redis.service.ts` — сохранение/восстановление комнат
- `admin/admin.controller.ts` — REST API для админки (`/admin/*`), защищён `AdminGuard` (Bearer `ADMIN_SECRET`)
- `ml/ml.service.ts` — ML-сервис: TTS диктора, генерация картинок

### `RoomState` (серверное состояние комнаты)
```ts
code: string
phase: GamePhase
players: RoomPlayer[]
world: WorldState | null
phaseEndsAt: number | null  // unix ms конца фазы
sectorBudget: Record<string, Partial<Record<string, number>>>  // % дохода по секторам
currentCards: Record<string, AdvisorCard | null>
callsLeft: Record<string, number>
spyOrdersLeft: Record<string, number>
tradeOffers: TradeOfferView[]
votes: { voterCountryId, targetCountryId, kind }[]
waitingContinue: boolean  // хост должен нажать «Продолжить»
readyPlayerIds: string[]
```

### Ключевые методы RoomsService:
- `createRoom()` / `joinRoom()` — лобби
- `startGame()` — инициализирует `WorldState`, запускает фазы
- `enterPhase(room, phase)` — переход фазы, запуск таймера, запуск ботов
- `onPhaseTimeout(room)` — что делать когда таймер истёк
- `resolveCabinetEnd()` — перед переходом в ООН: применяет бюджет, апгрейдит секторы
- `tick(room)` — вызывает `engine.tick()`, генерирует новости
- `chooseCard()` — карточка + wonder fallback
- `setBudget()` — сохраняет % распределение по секторам
- `hostExtendPhase(extraSeconds)` — 0 = завершить сразу, >0 = продлить
- `broadcast(room)` — рассылает `room:state` всем игрокам комнаты

### Боты
- Присоединяются через `addBots()`, `isBot: true`
- Ходы ботов расставлены по таймерам в `enterPhase(..., 'cabinet')`
- 80% вероятность принять входящий звонок
- 40% вероятность позвонить живому игроку сами (через 8-20с после старта кабинета)
- Виды шпионажа ботов: `['reveal', 'steal_science', 'steal_money', 'provoke_riot']`

---

## `@leaders/web` — React клиент

### Роутинг (App.tsx)
Нет react-router. `snapshot.phase` определяет экран:
- `!session` → `JoinScreen`
- `lobby` → `LobbyScreen`
- `cabinet` → `CabinetScreen`
- `un_*` / `results` → `UnScreen`
- `final` → `FinalScreen`
- `window.location.pathname.startsWith('/admin')` → `AdminPage`

### Главный стейт: `useGame()` (lib/useGame.tsx)
`GameProvider` — React context, singleton. Содержит:
- `snapshot: RoomSnapshot | null` — актуальное состояние от сервера
- `session: { roomCode, playerId, playerToken, name }` — сохраняется в localStorage
- `emitRaw(event, body)` — универсальный emit с ack (timeout 7с)
- Все игровые экшены: `chooseCard`, `markReady`, `spyOrder`, `hostContinue` и т.д.
- `announcements[]` — стек объявлений (`game:announcement`)

**Паттерн ответа сервера**: все c2s события возвращают `{ ok: boolean, data?, error? }`.  
`guard()` внутри useGame ставит `error` в стейт при `ok: false`.

### Экраны

**CabinetScreen.tsx** (фаза cabinet):
- Вкладки: Советник / Страна / Дипломатия
- Советник: `SwipeCard` → `CardResultModal` → следующая карта
- Страна: `ResourcePanel` (ресурсы, прогноз) + `BudgetPanel` (слайдеры бюджета)
- Дипломатия: `CallPanel` + `TradePanel` + `SpyPanel`
- Кнопка «Готов» → `showReadyConfirm` модал → `markReady()`

**UnScreen.tsx** (все фазы ООН + results):
- `flex h-dvh flex-col overflow-hidden` — нет скролла
- Шапка (фаза + таймер) → основной контент → видео-полоса (strip) → контрол-бар
- Хост-кнопки (только `un_debate`): «+2 мин» и «Завершить»
- `waitingContinue` → кнопка «Продолжить»

**LobbyScreen.tsx**:
- VideoGrid вверху (~55vh)
- Вкладки: Созвон / Страны / Хост
- Страны: карточки всех стран с описанием, amber-border для своей

### Видео (LiveKit)
- `useVideoRoom.ts` — подключается к LiveKit, управляет mic/cam
- `VideoGrid.tsx` — рендерит тайлы, props:
  - `layout?: 'grid' | 'strip'`
  - `showControls?: boolean` — кнопки mic/cam на локальном тайле
  - `showControlBar?: boolean` — обёртка с контрол-баром внизу
  - `hostControls?: ReactNode` — хост-кнопки внутри контрол-бара
- **Важно**: один `VideoGrid` на экран = одно LiveKit-подключение. Не плодить.

---

## Контент (`content/`)

### Структура JSON

**Страна** (`countries/<id>.json`):
```json
{
  "id": "imperiya",
  "name": "Империя",
  "startResources": { "money": 600, "gold": 120, "food": 600, "influence": 80 },
  "startPopulation": { "rabotyagi": 350, "umniki": 100, "siloviki": 220, "mediyshchiki": 150, "ministry": 60 },
  "startSectors": { "economy": 5, "science": 6, "army": 8, "smi": 8, "intel": 9 },
  "startStatuses": [],
  "uniqueWeaknesses": ["high_minister_upkeep"],
  "notes": "Для подсказки в лобби"
}
```

**Карточка советника** (`advisors/*.json`):
```json
{
  "id": "deficit_byudzheta",
  "speaker": "Министр финансов",
  "situation": "Денег нет. Варианты: напечатать...",
  "choices": [
    {
      "label": "Печатаем",
      "effects": { "resources": { "money": 200 }, "modifiers": { "special": { "printedMoney": 200 } } },
      "newsLines": { "liberal": "...", "state": "..." },
      "wonderFallbackName": "RuTube"
    }
  ],
  "weight": 1,
  "requires": { "statuses": ["regime_kommunizm"] }
}
```

**Статус** (`statuses/<id>.json`):
```json
{
  "id": "regime_kommunizm",
  "name": "Коммунизм",
  "type": "regime",           // regime | law | tech | wonder | special
  "exclusiveGroup": "regime", // только один из группы одновременно
  "requires": { "statuses": [...], "conditions": ["no_rich"] },
  "effects": { "modifiers": { "inflationDelta": -0.05 } },
  "unlocks": { "advisorCards": ["card_pyatiletka"] },
  "locks": { "statuses": ["regime_dikiy_kapitalizm"] },
  "mediaIsLiberal": false     // для режимных статусов
}
```

**Квест** (`quests/<id>.json`):
```json
{ "id": "tonna_zolota", "name": "Накопить тонну золота", "check": { "gold": ">=1000" }, "forbesBonus": 5000 }
```

**Чудо** (`wonders/<id>.json`):
```json
{ "id": "wonder_first_youtube", "name": "Первый YouTube", "effects": { "sectors": { "smi": 2 }, "modifiers": { "forbesLegacy": 30 } } }
```

**Tunables** (`tunables.json`) — все коэффициенты, есть дефолты в схеме. Валидируется Zod `.strict()`.

### Валидация контента
```bash
pnpm content:validate   # build shared + engine content:validate
```
Любая опечатка в JSON → краш при старте сервера (`ContentService.onModuleInit`).

### Редактирование контента через Админку
Путь: `mygame-quiz.ru/admin` (Bearer: `9135`)
- Карточки: просмотр/редактирование эффектов, newsLines, wonderFallbackName
- Статусы: редактирование эффектов, mediaIsLiberal
- Balance report: таблица весов карточек

---

## Ключевые механики

### Форбс (победные очки)
`computeForbes(state, content)` = деньги + золото × 3 + квест-бонус + legacy (чудеса)

### Инфляция
- Базовая: 3%/год
- +2% за каждую санкцию ООН
- −0.4% за каждый уровень Экономики
- Напечатанные деньги: `printedMoney / 100 × 1%`
- Снижает курс валюты (`moneyRate`) и долбит довольство

### Довольство
Изменяется каждый тик:
- `+` избыток еды (foodSurplusCoef)
- `+` уровень СМИ × smiCoef
- `+` богатство (деньги на душу × wealthCoef)
- `−` голод (hungerPenalty)
- `−` инфляция × inflationPenalty
- `−` репрессии × repressionPenalty
- `−` baselineDecay («привыкание»)

### Бюджет секторов
- Игрок задаёт % дохода → в `sectorBudget`
- В `resolveCabinetEnd()`: `sectorInvestment[s] += income × pct/100`
- При накоплении `≥ investPerLevel` (дефолт 1000): сектор +1

### Шпионаж
Шанс успеха: `baseSuccess + (intel_atk − intel_def − smi_def×0.5) × perLevelDelta`, зажат [0.05, 0.95]

Действия: `reveal`, `steal_science`, `steal_money`, `steal_food`, `steal_gold`, `wreck_wonder`, `provoke_riot`, `assassinate_minister`

### Новости (СМИ-режим)
Если у страны активен режим с `mediaIsLiberal: false` → берётся `choice.newsLines.state`.  
Иначе → `choice.newsLines.liberal`.  
Нет `newsLines` → дефолтная строка `"[speaker] предложил — лидер решил: «[label]»"`.

### Wonder fallback
`buildWonder()` бросает `WonderError` если чудо уже занято другой страной.  
`rooms.service.chooseCard()` перехватывает → берёт `wonderFallbackName` из choice JSON → присылает `{ wonderFallback: string }` в ответе → клиент показывает предупреждение в `CardResultModal`.

---

## Часто встречающиеся ловушки

1. **Stale dist**: после правки `@leaders/shared` или `@leaders/engine` — всегда пересобирать их перед сборкой server/web.

2. **`.strict()` в схемах Zod**: добавил поле в `content/*.json` — добавь его в схему, иначе сервер не стартует.

3. **Caddy срезает `/api/`**: `@Controller('admin')`, не `@Controller('api/admin')`.

4. **Два VideoGrid = два LiveKit**: на каждый экран только один `<VideoGrid>`. Контрол-бар рендерится внутри VideoGrid при `showControlBar=true`.

5. **Ack-паттерн**: все c2s события возвращают `{ ok, data?, error? }`. `safe()` в gateway ловит исключения. На клиенте `emitRaw()` + `guard()`.

6. **Map vs Object для world**: `WorldState.countries` — `Map<string, CountryState>`, `WorldState.wondersTaken` — `Map<string, string>`. В Redis сериализуются через `serializeWorld()` / `deserializeWorld()`.

7. **snapshot.builder.ts**: `buildSnapshot` вызывается при каждом `broadcast()`. Дорогие вычисления (projection) делаются здесь — они только читают state, не мутируют.
