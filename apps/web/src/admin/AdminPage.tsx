import { useEffect, useState } from 'react';
import { adminApi, getSecret, saveSecret, type CardEntry, type AnalysisReport, type StatusEntry } from './api';
import { CardEditor } from './CardEditor';
import { BalanceReport } from './BalanceReport';
import { StatusEditor } from './StatusEditor';
import { SessionsPanel } from './SessionsPanel';
import { TimersPanel } from './TimersPanel';
import { CountryEditor } from './CountryEditor';
import { ContentSchema } from './ContentSchema';

type Tab = 'cards' | 'statuses' | 'countries' | 'schema' | 'analysis' | 'sessions' | 'timers';

export function AdminPage() {
  const [secret, setSecret] = useState(getSecret);
  const [input, setInput] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>('cards');
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [statuses, setStatuses] = useState<StatusEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCards = async () => {
    setLoading(true);
    setError('');
    try {
      const c = await adminApi.getCards();
      setCards(c);
    } catch (e) {
      setError((e as Error).message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  const loadStatuses = async () => {
    setLoading(true);
    setError('');
    try {
      const s = await adminApi.getStatuses();
      setStatuses(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const a = await adminApi.getAnalysis();
      setAnalysis(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const [applyMsg, setApplyMsg] = useState('');
  const handleApply = async () => {
    setApplyMsg('Применяю…');
    try {
      await adminApi.reload();
      setApplyMsg('✓ применено в игре');
    } catch (e) {
      setApplyMsg('Ошибка: ' + (e as Error).message);
    }
    setTimeout(() => setApplyMsg(''), 4000);
  };

  const [prerenderStatus, setPrerenderStatus] = useState<{ ready: number; total: number } | null>(null);
  const [prerenderMsg, setPrerenderMsg] = useState('');
  const loadPrerenderStatus = async () => {
    try {
      const s = await adminApi.getPrerenderStatus();
      setPrerenderStatus(s);
    } catch { /* ignore */ }
  };
  const handlePrerenderAll = async () => {
    setPrerenderMsg('Ставлю в очередь…');
    try {
      const r = await adminApi.prerenderAll();
      setPrerenderMsg(`✓ +${r.enqueued} / ${r.total} (${r.skipped} уже есть)`);
      void loadPrerenderStatus();
    } catch (e) {
      setPrerenderMsg('Ошибка: ' + (e as Error).message);
    }
    setTimeout(() => setPrerenderMsg(''), 6000);
  };

  useEffect(() => {
    if (authed) void loadPrerenderStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleLogin = async () => {
    saveSecret(input);
    setSecret(input);
    setAuthed(true);
  };

  useEffect(() => {
    if (!authed) return;
    if (tab === 'cards' || tab === 'schema') void loadCards();
    if (tab === 'statuses' || tab === 'schema') void loadStatuses();
    if (tab === 'analysis') void loadAnalysis();
    // sessions / timers — самозагружаемые панели
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tab]);

  if (!authed || !secret) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 p-5">
        <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6">
          <h1 className="mb-4 text-2xl font-black text-amber-400">Админка Leaders</h1>
          <input
            type="password"
            placeholder="ADMIN_SECRET"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
            className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 focus:border-amber-400 focus:outline-none"
          />
          <button
            onClick={() => void handleLogin()}
            className="w-full rounded-xl bg-amber-500 py-2.5 font-bold text-slate-950"
          >
            Войти
          </button>
          {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-xl font-black text-amber-400">Админка Leaders</h1>
          <div className="flex items-center gap-3">
            {prerenderMsg && <span className="text-xs text-sky-300">{prerenderMsg}</span>}
            {prerenderStatus && !prerenderMsg && (
              <span className="text-xs text-slate-500">
                TTS: {prerenderStatus.ready}/{prerenderStatus.total}
              </span>
            )}
            <button
              onClick={() => void handlePrerenderAll()}
              title="Пре-рендерить все TTS-фразы карточек заранее (требует ML-box)"
              className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-600"
            >
              🎙 Пре-рендер TTS
            </button>
            {applyMsg && <span className="text-xs text-emerald-300">{applyMsg}</span>}
            <button
              onClick={() => void handleApply()}
              title="Применить правки контента (карточки/статусы/страны) в игре без рестарта"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              🔄 Применить
            </button>
            <button
              onClick={() => { saveSecret(''); setAuthed(false); setSecret(''); }}
              className="text-xs text-slate-500 underline"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Вкладки */}
        <div className="mb-4 flex gap-1 rounded-xl bg-slate-900 p-1">
          {([
            ['cards', 'Карточки'],
            ['statuses', 'Статусы'],
            ['countries', 'Страны'],
            ['schema', 'Схема (Граф)'],
            ['analysis', 'Баланс'],
            ['sessions', 'Сессии'],
            ['timers', 'Тест-режим'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                tab === id ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-10 text-center text-slate-500">Загрузка…</div>
        )}

        {!loading && tab === 'cards' && (
          <CardEditor cards={cards} onRefresh={() => void loadCards()} />
        )}

        {!loading && tab === 'statuses' && (
          <StatusEditor statuses={statuses} onRefresh={() => void loadStatuses()} />
        )}

        {!loading && tab === 'schema' && (
          <ContentSchema cards={cards} statuses={statuses} onRefresh={() => void loadCards()} />
        )}

        {!loading && tab === 'analysis' && analysis && (
          <BalanceReport report={analysis} />
        )}

        {tab === 'countries' && <CountryEditor />}

        {tab === 'sessions' && <SessionsPanel />}

        {tab === 'timers' && <TimersPanel />}
      </div>
    </div>
  );
}
