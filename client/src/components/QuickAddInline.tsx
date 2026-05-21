import { useState, type KeyboardEvent } from 'react';

interface Props {
  label: string;
  onAdd: (name: string) => Promise<void>;
}

export default function QuickAddInline({ label, onAdd }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(trimmed);
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="quick-add">
      <input
        type="text"
        placeholder={label}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
      />
      <button type="button" onClick={() => void submit()} disabled={busy || !name.trim()}>
        Add
      </button>
      {error && <span className="error inline">{error}</span>}
    </div>
  );
}
