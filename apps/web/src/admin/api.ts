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
  createCard: (data: CardEntry & { deckCountry?: string | null }) =>
    apiFetch('/api/admin/cards', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, data: Partial<StatusEntry>) =>
    apiFetch('/api/admin/statuses/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  createStatus: (data: StatusEntry) =>
    apiFetch('/api/admin/statuses', { method: 'POST', body: JSON.stringify(data) }),
  // сессии
  getRooms: () => apiFetch<RoomSummary[]>('/api/admin/rooms'),
  killRoom: (code: string) => apiFetch<{ ok: boolean }>(`/api/admin/rooms/${code}/kill`, { method: 'POST' }),
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
