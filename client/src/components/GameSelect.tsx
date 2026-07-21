import type { Game } from '../types';

interface Props {
  games: Game[];
  value: number | null;
  onChange: (id: number) => void;
}

export default function GameSelect({ games, value, onChange }: Props) {
  return (
    <div className="field">
      <label>Game</label>
      <select value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
        <option value="" disabled>
          Select a game…
        </option>
        {games.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  );
}
