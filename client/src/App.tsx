import { useState } from 'react';
import RecordPlayForm from './components/RecordPlayForm';
import RecentPlays from './components/RecentPlays';
import Leaderboard from './components/Leaderboard';
import Compare from './components/Compare';

type Tab = 'record' | 'recent' | 'leaderboard' | 'compare';

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
          <button
            type="button"
            className={tab === 'compare' ? 'active' : ''}
            onClick={() => setTab('compare')}
          >
            Compare
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
        {tab === 'compare' && <Compare refreshKey={refreshKey} />}
      </main>
    </div>
  );
}
