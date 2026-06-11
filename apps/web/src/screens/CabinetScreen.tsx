import { useGame } from '../lib/useGame';
import { Timer } from '../ui/Timer';
import { SwipeCard } from './cabinet/SwipeCard';
import { ResourcePanel } from './cabinet/ResourcePanel';
import { SpyPanel } from './cabinet/SpyPanel';
import { TradePanel } from './cabinet/TradePanel';
import { CallPanel } from '../video/CallPanel';

export function CabinetScreen() {
  const { snapshot, chooseCard } = useGame();
  if (!snapshot?.you) return null;
  const you = snapshot.you;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-4 p-4">
      <header className="flex w-full max-w-sm items-center justify-between">
        <div>
          <div className="text-xs uppercase text-slate-500">
            Год {snapshot.year}/{snapshot.totalYears} · Кабинет
          </div>
          <div className="font-bold text-amber-400">{you.countryName}</div>
        </div>
        <div className="text-2xl">
          <Timer endsAt={snapshot.phaseEndsAt} />
        </div>
      </header>

      <ResourcePanel you={you} />

      {you.currentCard ? (
        <SwipeCard
          key={you.currentCard.id}
          card={you.currentCard}
          onChoose={(i) => void chooseCard(you.currentCard!.id, i)}
        />
      ) : (
        <div className="flex h-48 items-center justify-center text-slate-500">
          Советники выдохлись — карт больше нет
        </div>
      )}

      <div className="mt-auto flex w-full max-w-sm flex-col gap-2 pb-4">
        <CallPanel you={you} others={snapshot.others} />
        <TradePanel you={you} others={snapshot.others} />
        <SpyPanel others={snapshot.others} myCountryId={you.countryId} />
      </div>
    </div>
  );
}
