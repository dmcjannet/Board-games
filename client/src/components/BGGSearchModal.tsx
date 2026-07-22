import { useEffect, useState, type KeyboardEvent } from 'react';
import { api } from '../api/client';
import type { BGGImportResult, BGGSearchResult } from '../types';

interface Props {
  gameId: number;
  gameName: string;
  hasImage: boolean;
  onImported: (result: BGGImportResult) => void;
  onClose: () => void;
}

export default function BGGSearchModal({ gameId, gameName, hasImage, onImported, onClose }: Props) {
  const [query, setQuery] = useState(gameName);
  const [results, setResults] = useState<BGGSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [replaceImage, setReplaceImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent | globalThis.KeyboardEvent) {
      if (e.key === 'Escape' && importingId == null) onClose();
    }
    window.addEventListener('keydown', onKey as (e: globalThis.KeyboardEvent) => void);
    return () => window.removeEventListener('keydown', onKey as (e: globalThis.KeyboardEvent) => void);
  }, [onClose, importingId]);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const data = await api.bggSearch(q);
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  // Auto-run search once when the modal opens with a pre-filled game name.
  useEffect(() => {
    if (query.trim()) void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importChoice(bggId: number) {
    setImportingId(bggId);
    setError(null);
    try {
      const result = await api.bggImportToGame(gameId, bggId, replaceImage);
      onImported(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setImportingId(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => (importingId == null ? onClose() : undefined)} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Import from BoardGameGeek</h2>
            <p className="muted small">Search BGG, click a match to enrich this game with tags {hasImage ? '(image kept)' : 'and box art'}.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close" disabled={importingId != null}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="bgg-search-row">
            <input
              type="search"
              className="search-input"
              placeholder="Search BGG…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void runSearch();
                }
              }}
              disabled={importingId != null}
              autoFocus
            />
            <button type="button" className="ghost small" onClick={() => void runSearch()} disabled={searching || importingId != null}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {hasImage && (
            <label className="replace-image-toggle">
              <input
                type="checkbox"
                checked={replaceImage}
                onChange={(e) => setReplaceImage(e.target.checked)}
                disabled={importingId != null}
              />
              Replace the current image with BGG's box art
            </label>
          )}

          {error && <p className="error">{error}</p>}

          {!searching && results && results.length === 0 && (
            <p className="muted">No results. Try a different query.</p>
          )}

          {results && results.length > 0 && (
            <ul className="bgg-results">
              {results.map((r) => (
                <li key={r.bggId} className="bgg-result">
                  <button
                    type="button"
                    className="bgg-result-button"
                    onClick={() => void importChoice(r.bggId)}
                    disabled={importingId != null}
                  >
                    <span className="bgg-result-name">{r.name}</span>
                    {r.yearPublished != null && (
                      <span className="bgg-result-year">{r.yearPublished}</span>
                    )}
                    <span className="bgg-result-action">
                      {importingId === r.bggId ? 'Importing…' : 'Import'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
