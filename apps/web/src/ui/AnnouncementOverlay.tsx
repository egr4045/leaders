import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../lib/useGame';

export function AnnouncementOverlay() {
  const { announcements, dismissAnnouncement } = useGame();
  const current = announcements[0];

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -10 }}
            className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-3 text-xl font-black text-amber-400">{current.title}</div>
            <p className="mb-6 text-slate-200 leading-relaxed">{current.text}</p>
            <button
              onClick={dismissAnnouncement}
              className="w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-950 hover:bg-amber-400"
            >
              Понятно
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
