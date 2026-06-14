import { motion } from 'framer-motion';
import { useGame } from '../lib/useGame';

const getRankColors = (index: number) => {
  switch (index) {
    case 0:
      return 'border-amber-400/50 bg-amber-500/10 text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.2)]';
    case 1:
      return 'border-slate-300/50 bg-slate-400/10 text-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.1)]';
    case 2:
      return 'border-orange-700/50 bg-orange-800/10 text-orange-400 shadow-[0_0_20px_rgba(194,65,12,0.1)]';
    default:
      return 'border-white/5 bg-white/5 text-slate-200';
  }
};

const getRankBadge = (index: number) => {
  switch (index) {
    case 0:
      return '👑 1';
    case 1:
      return '🥈 2';
    case 2:
      return '🥉 3';
    default:
      return `${index + 1}`;
  }
};

export function FinalScreen() {
  const { snapshot, leaveRoom } = useGame();
  if (!snapshot?.finalForbes) return null;

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-slate-950 font-sans text-slate-50 selection:bg-amber-500/30">
      {/* Background Glows */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 bg-amber-500/10 opacity-50 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-blue-900/10 blur-[100px]" />

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 p-6 pb-24 pt-16">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-amber-500/80">Итоги партии</div>
          <h1 className="bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-5xl font-black tracking-tight text-transparent drop-shadow-lg md:text-7xl">
            СПИСОК ФОРБС
          </h1>
          <p className="mt-4 max-w-lg text-slate-400">
            Реальные состояния вскрыты. Тайные квесты завершены. Пора подвести черту и узнать, кто стал истинным властелином мира.
          </p>
        </motion.div>

        <motion.ol
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } },
          }}
          className="flex w-full flex-col gap-4"
        >
          {snapshot.finalForbes.map((f, i) => {
            const isTop3 = i < 3;
            return (
              <motion.li
                key={f.playerId}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 },
                }}
                className={`relative flex flex-col gap-4 overflow-hidden rounded-2xl border backdrop-blur-md transition-transform hover:scale-[1.01] sm:flex-row sm:items-center sm:p-6 p-4 ${getRankColors(
                  i,
                )}`}
              >
                {/* Decoration line for top 3 */}
                {isTop3 && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-current to-transparent opacity-50" />
                )}

                <div className="flex w-16 shrink-0 items-center justify-center text-3xl font-black opacity-80 sm:text-4xl">
                  {getRankBadge(i)}
                </div>

                <div className="flex flex-1 flex-col justify-center">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xl font-bold tracking-tight sm:text-2xl">{f.playerName}</span>
                    <span className="text-sm font-medium opacity-60">· {f.countryName}</span>
                  </div>
                  
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-75">
                    <div>
                      <span className="opacity-60">Заявлял:</span>{' '}
                      <span className="font-semibold">{f.declared ?? 'молчал'}</span>
                    </div>
                    {f.questName && (
                      <div className="flex items-center gap-1">
                        <span className="opacity-60">Квест «{f.questName}»:</span>
                        <span className={f.questDone ? 'font-bold text-green-400' : 'font-bold text-red-400'}>
                          {f.questDone ? 'ВЫПОЛНЕН' : 'ПРОВАЛЕН'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 shrink-0 sm:mt-0 sm:text-right">
                  <div className="text-xs font-bold uppercase tracking-widest opacity-50">Реальный Форбс</div>
                  <div className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl">
                    {f.real}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="mt-8"
        >
          <button
            onClick={() => void leaveRoom()}
            className="group relative overflow-hidden rounded-full bg-slate-800 px-8 py-4 font-bold tracking-wide text-white transition-all hover:bg-slate-700 hover:shadow-lg hover:shadow-slate-900/50 active:scale-95"
          >
            <span className="relative z-10">В ГЛАВНОЕ МЕНЮ</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
