export function LandingAtmosphere() {
  return (
    <div className="home-atmosphere" aria-hidden="true">
      <svg className="landing-art" viewBox="0 0 1440 820" preserveAspectRatio="xMidYMid slice" role="presentation">
        <defs>
          <linearGradient id="atmo-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--atmo-sky-top)" />
            <stop offset="0.58" stopColor="var(--atmo-sky-mid)" />
            <stop offset="1" stopColor="var(--atmo-sky-bottom)" />
          </linearGradient>
          <radialGradient id="atmo-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="var(--atmo-sun-glow)" />
            <stop offset="1" stopColor="var(--atmo-sun-glow)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="atmo-sun-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--atmo-sun-top)" />
            <stop offset="1" stopColor="var(--atmo-sun)" />
          </linearGradient>
          <linearGradient id="atmo-far-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--atmo-far)" />
            <stop offset="1" stopColor="var(--atmo-mid)" stopOpacity="0.66" />
          </linearGradient>
          <linearGradient id="atmo-mid-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--atmo-mid)" />
            <stop offset="1" stopColor="var(--atmo-near)" />
          </linearGradient>
          <linearGradient id="atmo-mist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--atmo-mist)" stopOpacity="0" />
            <stop offset="0.55" stopColor="var(--atmo-mist)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--atmo-mist)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="1440" height="820" fill="url(#atmo-sky)" />

        <g className="landing-rays" stroke="var(--atmo-ray)" strokeWidth="1.2" opacity="0.6">
          <path d="M980 310 40 80" />
          <path d="M980 310 180 0" />
          <path d="M980 310 440 -40" />
          <path d="M980 310 760 -60" />
          <path d="M980 310 1180 -40" />
          <path d="M980 310 1440 110" />
          <path d="M980 310 1430 430" />
        </g>

        <g className="landing-sun-group">
          <circle cx="980" cy="310" r="310" fill="url(#atmo-glow)" />
          <circle className="landing-halo landing-halo-outer" cx="980" cy="310" r="222" fill="none" stroke="var(--atmo-halo)" strokeWidth="1" strokeDasharray="2 9" />
          <circle className="landing-halo landing-halo-inner" cx="980" cy="310" r="174" fill="none" stroke="var(--atmo-halo)" strokeWidth="1" />
          <circle className="landing-sun" cx="980" cy="310" r="132" fill="url(#atmo-sun-fill)" />
          <circle cx="980" cy="310" r="132" fill="none" stroke="var(--atmo-sun-line)" strokeWidth="1" opacity="0.55" />
        </g>

        <g className="landing-clouds" fill="var(--atmo-cloud)">
          <path className="landing-cloud landing-cloud-a" d="M-180 190c90-34 170 12 248-4 59-13 99-36 160-22 55 12 86 39 145 33 51-6 80-27 132-14v44c-56-9-93 10-137 16-54 7-91-18-141-27-55-10-105 18-161 23-68 6-111-24-173-7-30 8-51 9-73 6v-48Z" />
          <path className="landing-cloud landing-cloud-b" d="M-120 285c75-24 152 4 217-10 72-16 99-41 166-28 56 11 83 35 144 27 55-7 91-30 144-16 45 12 76 32 130 26v34c-60-2-103 11-151 12-54 2-82-22-135-27-58-5-103 23-164 21-59-2-93-21-147-13-44 7-70 14-112 5v-31Z" />
          <path className="landing-cloud landing-cloud-c" d="M-80 380c62-20 133 2 196-9 62-12 96-34 158-21 52 11 85 30 137 24 46-5 83-24 130-12 44 10 89 28 139 20v30c-58-3-102 10-150 10-53 0-82-19-132-21-57-3-98 18-154 16-54-2-90-16-138-9-45 6-82 9-126 2v-30Z" />
        </g>

        <g transform="translate(1110 205)">
          <g className="landing-birds" fill="none" stroke="var(--atmo-bird)" strokeWidth="2" strokeLinecap="round">
            <path d="M0 0c7-7 13-7 20 0 7-7 13-7 20 0" />
            <path d="M68 34c5-5 9-5 14 0 5-5 9-5 14 0" />
            <path d="M30 72c4-4 7-4 11 0 4-4 7-4 11 0" />
          </g>
        </g>

        <g transform="translate(0 -120)">
        <path fill="url(#atmo-far-gradient)" opacity="0.82" d="M0 592 96 542l86 29 112-82 102 74 95-44 123 53 110-102 108 88 95-43 112 55 93-29 108 54v127H0Z" />
        <path fill="var(--atmo-mid)" opacity="0.9" d="M0 658 118 598l103 37 108-59 122 82 112-50 134 37 114-72 120 58 114-31 116 47 101-24v197H0Z" />
        <rect x="0" y="596" width="1440" height="66" fill="url(#atmo-mist)" opacity="0.55" />

        <g transform="translate(0 -110)">
          <g className="landing-torii" fill="var(--atmo-torii)">
            <path d="M704 447c58-23 132-23 190 0l-5 13c-55-18-125-18-180 0Z" />
            <rect x="690" y="465" width="218" height="12" rx="3" />
            <rect x="724" y="486" width="14" height="178" rx="3" />
            <rect x="858" y="486" width="14" height="178" rx="3" />
            <rect x="706" y="526" width="186" height="9" rx="3" />
          </g>
        </g>

        <path fill="var(--atmo-near)" d="M0 709c128-29 240 8 354-8 131-18 211-54 340-34 127 20 213 53 332 38 147-18 267-32 414 8v107H0Z" />
        <path fill="none" stroke="var(--atmo-ground-line)" strokeWidth="1" opacity="0.48" d="M0 742c180-11 285 17 445 7 167-11 269-31 418-13 174 21 295 23 577-2" />
        </g>

        <g className="landing-petals" fill="var(--atmo-petal)">
          <g transform="translate(1050 220)"><path className="landing-petal p1" d="M0 0c7-5 13 0 10 7-2 5-9 6-12 0Z" /></g>
          <g transform="translate(1210 330)"><path className="landing-petal p2" d="M0 0c6-4 11 0 9 6-2 4-8 5-11 0Z" /></g>
          <g transform="translate(910 260)"><path className="landing-petal p3" d="M0 0c6-4 11 0 9 6-2 4-8 5-11 0Z" /></g>
          <g transform="translate(1280 460)"><path className="landing-petal p4" d="M0 0c7-5 13 0 10 7-2 5-9 6-12 0Z" /></g>
          <g transform="translate(820 210)"><path className="landing-petal p5" d="M0 0c5-4 10 0 8 5-2 4-7 4-10 0Z" /></g>
          <g transform="translate(1130 410)"><path className="landing-petal p6" d="M0 0c5-4 10 0 8 5-2 4-7 4-10 0Z" /></g>
        </g>
      </svg>
      <div className="home-atmosphere-wash" />
      <div className="home-atmosphere-brand">
        <img src="/logo.png" alt="" />
        <span>REOGNIME</span>
        <i />
        <span>SUB INDO · 2026</span>
      </div>
    </div>
  );
}
