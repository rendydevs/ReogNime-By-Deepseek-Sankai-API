import { Link } from 'react-router-dom';

const JAPANESE_FONT = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', sans-serif";

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" className="logo" onClick={onClick} aria-label="Beranda ReogNime">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <g className="logo-crown" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" fill="none">
            <path d="M8.5 16.5c.8-4.6 3.6-8.5 7.8-10.4" />
            <path d="M14.5 14.2c.9-2.8 2.8-5.2 5.4-6.6" />
            <path d="M20 3.8v7.7" />
            <path d="M25.5 14.2c-.9-2.8-2.8-5.2-5.4-6.6" />
            <path d="M31.5 16.5c-.8-4.6-3.6-8.5-7.8-10.4" />
          </g>
          <circle cx="8.5" cy="16.5" r="1" fill="currentColor" opacity="0.55" />
          <circle cx="14.5" cy="14.2" r="0.85" fill="currentColor" opacity="0.45" />
          <circle cx="25.5" cy="14.2" r="0.85" fill="currentColor" opacity="0.45" />
          <circle cx="31.5" cy="16.5" r="1" fill="currentColor" opacity="0.55" />
          <circle cx="20" cy="3.8" r="1.8" fill="var(--accent)" />
          <text
            x="20"
            y="33.8"
            textAnchor="middle"
            fill="currentColor"
            fontFamily={JAPANESE_FONT}
            fontSize="21"
            fontWeight="600"
          >
            れ
          </text>
          <path d="M5 31.5l4.2-1.6M6.5 35l4-1.6M35 31.5l-4.2 1.6M33.5 35l-4-1.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
        </svg>
      </span>
      <span className="logo-word">ReogNime</span>
      <span className="logo-kana" lang="ja">れおぐ</span>
      <span className="logo-tag">Sub Indo</span>
    </Link>
  );
}
