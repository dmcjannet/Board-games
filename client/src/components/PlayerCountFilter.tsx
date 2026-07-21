interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  availableCounts: number[];
}

export default function PlayerCountFilter({ value, onChange, availableCounts }: Props) {
  // Nothing meaningful to filter with 0 or 1 distinct count.
  if (availableCounts.length <= 1) return null;

  return (
    <div className="filter-chips">
      <span className="filter-label">Players:</span>
      <div className="chips">
        <button
          type="button"
          className={`chip${value === null ? ' selected' : ''}`}
          onClick={() => onChange(null)}
        >
          All
        </button>
        {availableCounts.map((count) => (
          <button
            key={count}
            type="button"
            className={`chip${value === count ? ' selected' : ''}`}
            onClick={() => onChange(count)}
          >
            {count}p
          </button>
        ))}
      </div>
    </div>
  );
}
