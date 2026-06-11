import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import {
  AdvisorFileSchema,
  CountrySchema,
  QuestSchema,
  StatusSchema,
  TunablesSchema,
  type AdvisorFile,
  type Country,
  type Quest,
  type Status,
  type Tunables,
} from '@leaders/shared';

export interface GameContent {
  countries: Map<string, Country>;
  /** все статусы, включая чудеса (type === 'wonder') */
  statuses: Map<string, Status>;
  /** колоды советников по пути-ссылке, например "advisors/amerika.json" */
  advisorDecks: Map<string, AdvisorFile>;
  quests: Map<string, Quest>;
  tunables: Tunables;
}

export class ContentError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Контент не прошёл валидацию (${problems.length}):\n` + problems.map((p) => `  - ${p}`).join('\n'));
    this.name = 'ContentError';
  }
}

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(dir, f));
}

function formatZodError(file: string, err: z.ZodError): string[] {
  return err.issues.map(
    (i) => `${file}: ${i.path.length ? i.path.join('.') : '<корень>'} — ${i.message}`,
  );
}

function parseFile<T>(
  file: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  problems: string[],
): T | null {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (e) {
    problems.push(`${file}: не читается — ${(e as Error).message}`);
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    problems.push(`${file}: битый JSON — ${(e as Error).message}`);
    return null;
  }
  const res = schema.safeParse(json);
  if (!res.success) {
    problems.push(...formatZodError(file, res.error));
    return null;
  }
  return res.data;
}

/**
 * Загружает и валидирует весь каталог content/:
 * схемы + кросс-ссылки (статусы существуют, колоды существуют, id уникальны).
 * Бросает ContentError со списком всех проблем разом.
 */
export function loadContent(contentDir: string): GameContent {
  const problems: string[] = [];
  const rel = (f: string) => path.relative(contentDir, f);

  // --- tunables ---
  const tunablesFile = path.join(contentDir, 'tunables.json');
  const tunables: Tunables = fs.existsSync(tunablesFile)
    ? (parseFile(tunablesFile, TunablesSchema, problems) ?? TunablesSchema.parse({}))
    : TunablesSchema.parse({});

  // --- statuses + wonders (один реестр) ---
  const statuses = new Map<string, Status>();
  for (const file of [
    ...listJsonFiles(path.join(contentDir, 'statuses')),
    ...listJsonFiles(path.join(contentDir, 'wonders')),
  ]) {
    const st = parseFile(file, StatusSchema, problems);
    if (!st) continue;
    if (statuses.has(st.id)) problems.push(`${rel(file)}: дубль id статуса "${st.id}"`);
    statuses.set(st.id, st);
  }

  // --- advisors ---
  const advisorDecks = new Map<string, AdvisorFile>();
  const allCardIds = new Set<string>();
  for (const file of listJsonFiles(path.join(contentDir, 'advisors'))) {
    const deck = parseFile(file, AdvisorFileSchema, problems);
    if (!deck) continue;
    const ref = `advisors/${path.basename(file)}`;
    advisorDecks.set(ref, deck);
    for (const card of deck.cards) {
      if (allCardIds.has(card.id)) problems.push(`${rel(file)}: дубль id карты "${card.id}"`);
      allCardIds.add(card.id);
    }
  }

  // --- countries ---
  const countries = new Map<string, Country>();
  for (const file of listJsonFiles(path.join(contentDir, 'countries'))) {
    const c = parseFile(file, CountrySchema, problems);
    if (!c) continue;
    if (countries.has(c.id)) problems.push(`${rel(file)}: дубль id страны "${c.id}"`);
    countries.set(c.id, c);
  }

  // --- quests ---
  const quests = new Map<string, Quest>();
  for (const file of listJsonFiles(path.join(contentDir, 'quests'))) {
    const q = parseFile(file, QuestSchema, problems);
    if (!q) continue;
    if (quests.has(q.id)) problems.push(`${rel(file)}: дубль id квеста "${q.id}"`);
    quests.set(q.id, q);
  }

  // --- кросс-проверки ссылок ---
  const checkStatusRef = (where: string, id: string) => {
    if (!statuses.has(id)) problems.push(`${where}: ссылка на несуществующий статус "${id}"`);
  };
  const checkCardRef = (where: string, id: string) => {
    if (!allCardIds.has(id)) problems.push(`${where}: ссылка на несуществующую карту "${id}"`);
  };

  for (const c of countries.values()) {
    const where = `countries/${c.id}`;
    for (const id of [...c.startStatuses, ...c.uniquePerks, ...c.uniqueWeaknesses]) {
      checkStatusRef(where, id);
    }
    for (const id of c.exclusiveWonders) {
      checkStatusRef(where, id);
      const w = statuses.get(id);
      if (w && w.type !== 'wonder') problems.push(`${where}: "${id}" в exclusiveWonders — не чудо (type=${w.type})`);
    }
    if (c.advisorsRef) {
      if (!advisorDecks.has(c.advisorsRef)) {
        problems.push(`${where}: advisorsRef "${c.advisorsRef}" не найден`);
      } else {
        const deck = advisorDecks.get(c.advisorsRef)!;
        if (deck.country && deck.country !== c.id) {
          problems.push(`${where}: колода ${c.advisorsRef} принадлежит стране "${deck.country}"`);
        }
      }
    }
  }

  for (const st of statuses.values()) {
    const where = `statuses/${st.id}`;
    for (const id of st.requires?.statuses ?? []) checkStatusRef(where, id);
    for (const id of st.unlocks?.statuses ?? []) checkStatusRef(where, id);
    for (const id of st.locks?.statuses ?? []) checkStatusRef(where, id);
    for (const id of st.unlocks?.advisorCards ?? []) checkCardRef(where, id);
    for (const id of st.locks?.advisorCards ?? []) checkCardRef(where, id);
  }

  for (const [ref, deck] of advisorDecks) {
    for (const card of deck.cards) {
      const where = `${ref}#${card.id}`;
      for (const id of card.requires?.statuses ?? []) checkStatusRef(where, id);
      for (const choice of card.choices) {
        for (const id of [...(choice.addStatuses ?? []), ...(choice.removeStatuses ?? [])]) {
          checkStatusRef(where, id);
        }
      }
    }
  }

  if (problems.length > 0) throw new ContentError(problems);

  return { countries, statuses, advisorDecks, quests, tunables };
}
