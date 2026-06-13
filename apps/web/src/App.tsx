import { GameProvider, useGame } from './lib/useGame';
import { JoinScreen } from './screens/JoinScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { CabinetScreen } from './screens/CabinetScreen';
import { UnScreen } from './screens/UnScreen';
import { YearSummaryScreen } from './screens/YearSummaryScreen';
import { FinalScreen } from './screens/FinalScreen';
import { PauseOverlay, ErrorToast } from './ui/Overlays';
import { AnnouncementOverlay } from './ui/AnnouncementOverlay';
import { AdminPage } from './admin/AdminPage';

function Router() {
  const { snapshot, session } = useGame();

  if (!session || !snapshot) return <JoinScreen />;

  if (snapshot.phase !== 'lobby' && !snapshot.you) {
    return <LobbyScreen />;
  }

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
    case 'year_summary':
      return <YearSummaryScreen />;
    case 'final':
      return <FinalScreen />;
    default:
      return <JoinScreen />;
  }
}

export default function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminPage />;
  }

  return (
    <GameProvider>
      <div className="min-h-dvh bg-slate-950 text-slate-100">
        <Router />
        <PauseOverlay />
        <ErrorToast />
        <AnnouncementOverlay />
      </div>
    </GameProvider>
  );
}
