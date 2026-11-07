import { Link } from 'react-router-dom';

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" className="logo" onClick={onClick} aria-label="ReogNime home">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 30 30" fill="none">
          <path d="M9 23V7h6.8a5.2 5.2 0 1 1 0 10.4H9M15.8 17.4 22 23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="22.2" cy="7.8" r="2.1" fill="var(--accent)" />
        </svg>
      </span>
      <span className="logo-word">ReogNime</span>
      <span className="logo-tag">Sub Indo</span>
    </Link>
  );
}
