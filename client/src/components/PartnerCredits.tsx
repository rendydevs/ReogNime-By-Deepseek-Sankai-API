const PARTNERS = [
  {
    href: 'https://www.deepseek.com/',
    label: 'DeepSeek Harness',
    prefix: 'Built with',
    logo: '/brand/deepseek.png',
    className: 'credit-deepseek',
  },
  {
    href: 'https://otakudesu.or.at/',
    label: 'Otakudesu API',
    prefix: 'Data from',
    logo: '/brand/otakudesu.png',
    className: 'credit-otakudesu',
  },
];

export function HeaderCredits() {
  return (
    <div className="header-credits" aria-label="Kredit partner">
      {PARTNERS.map((partner) => (
        <a
          key={partner.label}
          className={`header-credit ${partner.className}`}
          href={partner.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${partner.prefix} ${partner.label}, buka di tab baru`}
          title={`${partner.prefix} ${partner.label}`}
        >
          <img src={partner.logo} alt="" width="18" height="18" />
          <span className="header-credit-copy">
            <small>{partner.prefix}</small>
            <strong>{partner.label}</strong>
          </span>
        </a>
      ))}
    </div>
  );
}

export function MobileCredits() {
  return (
    <div className="mobile-credits" aria-label="Kredit partner">
      {PARTNERS.map((partner) => (
        <a
          key={partner.label}
          href={partner.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${partner.prefix} ${partner.label}, buka di tab baru`}
        >
          <img src={partner.logo} alt="" width="17" height="17" />
          <span className="mobile-credit-copy">
            <small>{partner.prefix}</small>
            {partner.label}
          </span>
        </a>
      ))}
    </div>
  );
}

export function FooterCredits() {
  return (
    <div className="footer-partners" aria-label="Kredit partner">
      {PARTNERS.map((partner) => (
        <a
          key={partner.label}
          className="footer-partner"
          href={partner.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${partner.prefix} ${partner.label}, buka di tab baru`}
        >
          <img src={partner.logo} alt="" width="18" height="18" />
          <span className="footer-partner-copy">
            <small>{partner.prefix}</small>
            {partner.label}
          </span>
        </a>
      ))}
    </div>
  );
}
