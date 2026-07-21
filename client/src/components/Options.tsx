import { useState } from 'react';
import ManagePlays from './ManagePlays';
import AddEntities from './AddEntities';

type SubTab = 'historical' | 'add';

interface Props {
  refreshKey: number;
  onChanged: () => void;
}

export default function Options({ refreshKey, onChanged }: Props) {
  const [sub, setSub] = useState<SubTab>('historical');

  return (
    <div className="options">
      <nav className="subtabs">
        <button
          type="button"
          className={sub === 'historical' ? 'active' : ''}
          onClick={() => setSub('historical')}
        >
          Historical Plays
        </button>
        <button
          type="button"
          className={sub === 'add' ? 'active' : ''}
          onClick={() => setSub('add')}
        >
          Add Player and/or Game
        </button>
      </nav>

      {sub === 'historical' && <ManagePlays refreshKey={refreshKey} onChanged={onChanged} />}
      {sub === 'add' && <AddEntities refreshKey={refreshKey} onChanged={onChanged} />}
    </div>
  );
}
