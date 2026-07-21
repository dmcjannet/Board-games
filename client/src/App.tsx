import { useState } from 'react';
import RecordPlayForm from './components/RecordPlayForm';
import RecentPlays from './components/RecentPlays';
import Leaderboard from './components/Leaderboard';
import Compare from './components/Compare';
import Options from './components/Options';
import { SnackbarProvider } from './context/SnackbarContext';
import { PlayerProfileProvider } from './context/PlayerProfileContext';

type Tab = 'record' | 'recent' | 'leaderboard' | 'compare' | 'options';

function AppShell() {
  const [tab, setTab] = useState<Tab>('record');
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Board Game Score Tracker</h1>
        <nav className="tabs">
          <button type="button" className={tab === 'record' ? 'active' : ''} onClick={() => setTab('record')}>
            Record
          </button>
          <button type="button" className={tab === 'recent' ? 'active' : ''} onClick={() => setTab('recent')}>
            Recent
          </button>
          <button type="button" className={tab === 'leaderboard' ? 'active' : ''} onClick={() => setTab('leaderboard')}>
            Leaderboard
          </button>
          <button type="button" className={tab === 'compare' ? 'active' : ''} onClick={() => setTab('compare')}>
            Compare
          </button>
          <button type="button" className={tab === 'options' ? 'active' : ''} onClick={() => setTab('options')}>
            Options
          </button>
        </nav>
      </header>

      <main className="app-main">
        <div style={{ display: tab === 'record' ? 'block' : 'none' }}>
          <RecordPlayForm
            refreshKey={refreshKey}
            onSaved={() => {
              bumpRefresh();
              setTab('recent');
            }}
          />
        </div>
        {tab === 'recent' && <RecentPlays refreshKey={refreshKey} />}
        {tab === 'leaderboard' && <Leaderboard refreshKey={refreshKey} />}
        {tab === 'compare' && <Compare refreshKey={refreshKey} />}
        {tab === 'options' && <Options refreshKey={refreshKey} onChanged={bumpRefresh} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SnackbarProvider>
      <PlayerProfileProvider>
        <AppShell />
      </PlayerProfileProvider>
    </SnackbarProvider>
  );
}
