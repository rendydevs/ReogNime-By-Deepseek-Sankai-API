import { Check, Heart, LoaderCircle, Minus, Plus, Trash2, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { FORMAT_LABELS, STATUS_LABELS, STATUS_ORDER, episodeLabel, formatScore } from '../lib/format';
import { mediaUrl } from '../lib/media';
import type { AnimeSummary, LibraryStatus } from '../types';

interface LibraryDialogContextValue {
  open: (anime: AnimeSummary) => void;
}

const LibraryDialogContext = createContext<LibraryDialogContextValue | null>(null);

export function LibraryDialogProvider({ children }: { children: ReactNode }) {
  const [anime, setAnime] = useState<AnimeSummary | null>(null);
  const [open, setOpen] = useState(false);

  const openDialog = useCallback((nextAnime: AnimeSummary) => {
    setAnime(nextAnime);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open: openDialog }), [openDialog]);

  return (
    <LibraryDialogContext.Provider value={value}>
      {children}
      <LibraryDialog anime={anime} open={open} onClose={close} />
    </LibraryDialogContext.Provider>
  );
}

export function useLibraryDialog() {
  const context = useContext(LibraryDialogContext);
  if (!context) throw new Error('useLibraryDialog must be used inside LibraryDialogProvider');
  return context;
}

interface LibraryDialogProps {
  anime: AnimeSummary | null;
  open: boolean;
  onClose: () => void;
}

function LibraryDialog({ anime, open, onClose }: LibraryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { getEntry, addEntry, updateEntry, removeEntry } = useLibrary();
  const { notify } = useToast();
  const entry = anime ? getEntry(anime.id) : undefined;
  const [status, setStatus] = useState<LibraryStatus>('PLANNING');
  const [score, setScore] = useState('');
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!open || !anime) return;
    const existing = getEntry(anime.id);
    setStatus(existing?.status ?? 'PLANNING');
    setScore(existing?.score === null || existing?.score === undefined ? '' : existing.score.toFixed(1));
    setProgress(existing?.progress ?? 0);
    setNotes(existing?.notes ?? '');
    setFavorite(existing?.favorite ?? false);
    setError(null);
    setConfirmRemove(false);
  }, [open, anime?.id]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  const maxProgress = anime?.episodes ?? 9999;

  const changeStatus = (next: LibraryStatus) => {
    setStatus(next);
    if (next === 'COMPLETED' && anime?.episodes) setProgress(anime.episodes);
    if (next === 'PLANNING') setProgress(0);
  };

  const handleSave = async () => {
    if (!anime) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        status,
        score: score === '' ? null : Number(score),
        progress: Math.min(Math.max(progress, 0), maxProgress),
        notes: notes.trim(),
        favorite,
      };
      if (entry) {
        await updateEntry(anime.id, payload);
        notify(`${anime.title} updated.`);
      } else {
        await addEntry({ animeId: anime.id, ...payload });
        notify(`${anime.title} added to your list.`);
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this title.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!anime) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await removeEntry(anime.id);
      notify(`${anime.title} removed from your list.`);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not remove this title.');
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="library-dialog"
      aria-labelledby="library-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) onClose();
      }}
    >
      {anime && (
        <div className="dialog-card" onClick={(event) => event.stopPropagation()}>
          <header className="dialog-header">
            <div>
              <p className="eyebrow">Your list</p>
              <h2 id="library-dialog-title">{entry ? 'Edit entry' : 'Add to your list'}</h2>
            </div>
            <button className="icon-button" onClick={onClose} aria-label="Close dialog" disabled={busy}>
              <X size={19} />
            </button>
          </header>

          <div className="dialog-anime">
            <img src={mediaUrl(anime.cover)} alt="" className="dialog-cover" />
            <div>
              <h3>{anime.title}</h3>
              <p>
                {FORMAT_LABELS[anime.format]} · {anime.seasonYear ?? 'TBA'} · {episodeLabel(anime.episodes)}
              </p>
              <div className="dialog-score-line">
                <span className="mini-score" title="AniList average score">★ {formatScore(anime.score)} avg</span>
                {entry && <span className="dialog-entry-status">{STATUS_LABELS[entry.status]}</span>}
              </div>
            </div>
          </div>

          <div className="form-group">
            <span className="form-label">Status</span>
            <div className="status-options">
              {STATUS_ORDER.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`status-option ${status === option ? 'is-active' : ''}`}
                  onClick={() => changeStatus(option)}
                >
                  {status === option && <Check size={13} />}
                  {STATUS_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label className="form-group">
              <span className="form-label">Episode progress</span>
              <div className="progress-input">
                <button
                  type="button"
                  aria-label="Decrease progress"
                  onClick={() => setProgress((value) => Math.max(0, value - 1))}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={maxProgress}
                  value={progress}
                  onChange={(event) =>
                    setProgress(Math.min(Math.max(Number(event.target.value) || 0, 0), maxProgress))
                  }
                />
                <button
                  type="button"
                  aria-label="Increase progress"
                  onClick={() => setProgress((value) => Math.min(maxProgress, value + 1))}
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="form-hint">of {anime.episodes ?? 'TBA'}</span>
            </label>

            <label className="form-group">
              <span className="form-label">Your score</span>
              <select className="field" value={score} onChange={(event) => setScore(event.target.value)}>
                <option value="">Not scored</option>
                {Array.from({ length: 21 }, (_, index) => (index * 0.5).toFixed(1)).map((value) => (
                  <option key={value} value={value}>
                    {value} / 10
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-group">
            <span className="form-label">Notes <span className="form-label-light">(private)</span></span>
            <textarea
              className="field field-textarea"
              placeholder="A thought, a favourite scene, why you saved it…"
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
            />
            <span className="form-hint form-hint-right">{notes.length}/500</span>
          </label>

          <button
            type="button"
            className={`favorite-toggle ${favorite ? 'is-active' : ''}`}
            onClick={() => setFavorite((value) => !value)}
            aria-pressed={favorite}
          >
            <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
            {favorite ? 'One of your favourites' : 'Mark as a favourite'}
          </button>

          {error && <p className="form-error" role="alert">{error}</p>}

          <footer className="dialog-footer">
            {entry ? (
              <button className="text-button text-button-danger" onClick={handleRemove} disabled={busy}>
                <Trash2 size={15} />
                {confirmRemove ? 'Confirm remove' : 'Remove'}
              </button>
            ) : (
              <span />
            )}
            <div className="dialog-footer-actions">
              {confirmRemove && (
                <button className="button button-quiet" onClick={() => setConfirmRemove(false)} disabled={busy}>
                  Keep
                </button>
              )}
              <button className="button button-primary" onClick={handleSave} disabled={busy}>
                {busy ? <LoaderCircle size={16} className="spin" /> : null}
                {entry ? 'Save changes' : 'Add to list'}
              </button>
            </div>
          </footer>
        </div>
      )}
    </dialog>
  );
}
