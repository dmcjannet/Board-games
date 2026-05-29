import { useState } from 'react';
import RecordPlayForm from './components/RecordPlayForm';
import RecentPlays from './components/RecentPlays';
import Leaderboard from './components/Leaderboard';

type Tab = 'record' | 'recent' | 'leaderboard';

export default function App() {
  const [tab, setTab] = useState<Tab>('record');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Board Game Score Tracker</h1>
        <nav className="tabs">
          <button
            type="button"
            className={tab === 'record' ? 'active' : ''}
            onClick={() => setTab('record')}
          >
            Record
          </button>
          <button
            type="button"
            className={tab === 'recent' ? 'active' : ''}
            onClick={() => setTab('recent')}
          >
            Recent
          </button>
          <button
            type="button"
            className={tab === 'leaderboard' ? 'active' : ''}
            onClick={() => setTab('leaderboard')}
          >
            Leaderboard
          </button>
        </nav>
      </header>

      <main className="app-main">
        {tab === 'record' && (
          <RecordPlayForm
            onSaved={() => {
              setRefreshKey((k) => k + 1);
              setTab('recent');
            }}
          />
        )}
        {tab === 'recent' && <RecentPlays refreshKey={refreshKey} />}
        {tab === 'leaderboard' && <Leaderboard refreshKey={refreshKey} />}
      </main>
    </div>
  );
}
