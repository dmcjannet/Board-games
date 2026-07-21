interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  availableTags: string[];
}

export default function TagFilter({ value, onChange, availableTags }: Props) {
  if (availableTags.length === 0) return null;

  function toggle(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  }

  return (
    <div className="filter-chips">
      <span className="filter-label">Tags:</span>
      <div className="chips">
        {availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`chip${value.includes(tag) ? ' selected' : ''}`}
            onClick={() => toggle(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
