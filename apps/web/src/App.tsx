import { GameProvider, useGame } from './lib/useGame';
import { JoinScreen } from './screens/JoinScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { CabinetScreen } from './screens/CabinetScreen';
import { UnScreen } from './screens/UnScreen';
import { FinalScreen } from './screens/FinalScreen';
import { PauseOverlay, ErrorToast } from './ui/Overlays';

function Router() {
  const { snapshot, session } = useGame();

  if (!session || !snapshot) return <JoinScreen />;

  switch (snapshot.phase) {
    case 'lobby':
      return <LobbyScreen />;
    case 'cabinet':
      return <CabinetScreen />;
    case 'un_summary':
    case 'un_comments':
    case 'un_debate':
    case 'un_vote':
    case 'results':
      return <UnScreen />;
    case 'final':
      return <FinalScreen />;
    default:
      return <JoinScreen />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <div className="min-h-dvh bg-slate-950 text-slate-100">
        <Router />
        <PauseOverlay />
        <ErrorToast />
      </div>
    </GameProvider>
  );
}
