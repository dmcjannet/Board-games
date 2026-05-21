import { useState } from 'react';
import RecordPlayForm from './components/RecordPlayForm';
import RecentPlays from './components/RecentPlays';

type Tab = 'record' | 'recent';

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
            Record a Play
          </button>
          <button
            type="button"
            className={tab === 'recent' ? 'active' : ''}
            onClick={() => setTab('recent')}
          >
            Recent Plays
          </button>
        </nav>
      </header>

      <main className="app-main">
        {tab === 'record' ? (
          <RecordPlayForm
            onSaved={() => {
              setRefreshKey((k) => k + 1);
              setTab('recent');
            }}
          />
        ) : (
          <RecentPlays refreshKey={refreshKey} />
        )}
      </main>
    </div>
  );
}
