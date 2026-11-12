interface ReogMotifProps {
  className?: string;
}

/**
 * A quiet peacock-crown line drawing for ReogNime. It is deliberately loose:
 * a fan of feathers, an eye at each tip, and a small crown base. Used as a
 * low-contrast hero watermark rather than a logo lockup.
 */
export function ReogMotif({ className = '' }: ReogMotifProps) {
  const feathers = [-54, -36, -18, 0, 18, 36, 54];
  return (
    <svg className={className} viewBox="0 0 420 460" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="210" cy="255" r="188" opacity="0.3" strokeDasharray="1 8" />
        {feathers.map((angle) => (
          <g key={angle} transform={`rotate(${angle} 210 420)`}>
            <path d="M210 420C201 343 198 260 210 183" />
            <path d="M210 183c-17-14-18-37-2-52 16 15 18 38 2 52Z" />
            <ellipse cx="210" cy="157" rx="4.4" ry="8.4" />
            <circle cx="210" cy="157" r="1.5" fill="currentColor" stroke="none" />
          </g>
        ))}
        <path d="M139 420c18-25 120-31 142 0" />
        <path d="M170 420l17-35 23 18 23-18 17 35" />
        <path d="M191 385c11-10 27-10 38 0" />
        <circle cx="210" cy="372" r="3.2" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
