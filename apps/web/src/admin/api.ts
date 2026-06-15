const ADMIN_KEY = 'leaders.admin_secret';

export function getSecret(): string {
  return localStorage.getItem(ADMIN_KEY) ?? '';
}

export function saveSecret(s: string) {
  localStorage.setItem(ADMIN_KEY, s);
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getSecret()}`,
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

export const adminApi = {
  getCards: () => apiFetch<CardEntry[]>('/api/admin/cards'),
  getStatuses: () => apiFetch<StatusEntry[]>('/api/admin/statuses'),
  getAnalysis: () => apiFetch<AnalysisReport>('/api/admin/analysis'),
  updateCard: (id: string, data: Partial<CardEntry>) =>
    apiFetch('/api/admin/cards/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  updateCardChoice: (cardId: string, choiceIdx: number, data: Partial<ChoiceEntry>) =>
    apiFetch(`/api/admin/cards/${cardId}/choices/${choiceIdx}`, { method: 'PUT', body: JSON.stringify(data) }),
  createCard: (data: Record<string, unknown> & { deckCountry?: string | null }) =>
    apiFetch('/api/admin/cards', { method: 'POST', body: JSON.stringify(data) }),
  replaceCard: (id: string, raw: Record<string, unknown>) =>
    apiFetch('/api/admin/cards/' + id + '/raw', { method: 'PUT', body: JSON.stringify(raw) }),
  deleteCard: (id: string) =>
    apiFetch('/api/admin/cards/' + id, { method: 'DELETE' }),
  updateStatus: (id: string, data: Partial<StatusEntry>) =>
    apiFetch('/api/admin/statuses/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  replaceStatus: (id: string, raw: Record<string, unknown>) =>
    apiFetch('/api/admin/statuses/' + id + '/raw', { method: 'PUT', body: JSON.stringify(raw) }),
  createStatus: (data: Record<string, unknown>) =>
    apiFetch('/api/admin/statuses', { method: 'POST', body: JSON.stringify(data) }),
  // сессии
  getRooms: () => apiFetch<RoomSummary[]>('/api/admin/rooms'),
  killRoom: (code: string) => apiFetch<{ ok: boolean }>(`/api/admin/rooms/${code}/kill`, { method: 'POST' }),
  makeHost: (code: string, playerName: string) => apiFetch<{ ok: boolean }>(`/api/admin/rooms/${code}/host/${encodeURIComponent(playerName)}`, { method: 'POST' }),
  // страны
  getCountries: () => apiFetch<CountryEntry[]>('/api/admin/countries'),
  updateCountry: (id: string, raw: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>('/api/admin/countries/' + id, { method: 'PUT', body: JSON.stringify(raw) }),
  // пре-рендер TTS
  getPrerenderStatus: () => apiFetch<{ ready: number; total: number }>('/api/admin/ml/prerender-status'),
  prerenderAll: (force = false) => apiFetch<{ ok: boolean; enqueued: number; skipped: number; total: number }>(`/api/admin/ml/prerender-all${force ? '?force=1' : ''}`, { method: 'POST' }),
  // контент / tunables
  reload: () => apiFetch<{ ok: boolean }>('/api/admin/reload', { method: 'POST' }),
  getTunables: () => apiFetch<TunablesView>('/api/admin/tunables'),
  updateTunables: (patch: Record<string, unknown>) =>
    apiFetch<{ ok: boolean; tunables: TunablesView }>('/api/admin/tunables', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  uploadImage: async (id: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`/api/admin/cards/${id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getSecret()}` },
      body: fd,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ url: string }>;
  },
};

export interface ChoiceEntry {
  label: string;
  score: number;
  tags: string[];
  effects: Record<string, unknown>;
  newsLines?: { liberal: string; state: string };
  wonderFallbackName?: string;
  hasBuildWonder?: boolean;
}

export interface CardEntry {
  cardId: string;
  deckCountry: string | null;
  speaker: string;
  situation: string;
  weight: number;
  once: boolean;
  requires: Record<string, unknown> | null;
  choices: ChoiceEntry[];
  maxScore: number;
  imageUrl: string | null;
  raw: Record<string, unknown>;
}

export interface StatusEntry {
  id: string;
  name: string;
  type: string;
  description?: string;
  effects?: unknown;
  requires?: unknown;
  cost?: unknown;
}

export interface AnalysisReport {
  topCards: { id: string; country: string; maxScore: number; speaker: string }[];
  weakCards: { id: string; country: string; maxScore: number; speaker: string }[];
  byCountry: Record<string, { count: number; avgScore: number }>;
  heavyCards: { id: string; weight: number }[];
  delayedCards: string[];
  onceCards: string[];
  notes: string[];
}

export interface RoomSummary {
  code: string;
  phase: string;
  year: number | null;
  paused: boolean;
  phaseEndsAt: number | null;
  humanCount: number;
  botCount: number;
  players: { name: string; isHost: boolean; isBot: boolean; connected: boolean; country: string | null }[];
}

export interface TunablesTimers {
  cabinetSeconds: number;
  unSummarySeconds: number;
  unCommentSecondsPerPlayer: number;
  unDebateSeconds: number;
  unVoteSeconds: number;
  resultsSeconds: number;
  yearSummarySeconds: number;
  reconnectPauseSecondsMax: number;
}

export interface TunablesView {
  game: { years: number; playersMin: number; playersMax: number };
  timers: TunablesTimers;
  [k: string]: unknown;
}

export interface CountryEntry {
  id: string;
  name: string;
  startResources?: Record<string, number>;
  startPopulation?: Record<string, number>;
  startSectors?: Record<string, number>;
  startStatuses?: string[];
  uniquePerks?: string[];
  uniqueWeaknesses?: string[];
  exclusiveWonders?: string[];
  advisorsRef?: string;
  notes?: string;
  [k: string]: unknown;
}
