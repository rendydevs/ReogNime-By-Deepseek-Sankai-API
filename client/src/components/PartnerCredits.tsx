const PARTNERS = [
  {
    href: 'https://www.deepseek.com/',
    label: 'DeepSeek Harness',
    prefix: 'Built with',
    logo: '/brand/deepseek.png',
  },
  {
    href: 'https://otakudesu.or.at/',
    label: 'Otakudesu API',
    prefix: 'Data from',
    logo: '/brand/otakudesu.png',
  },
];

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
