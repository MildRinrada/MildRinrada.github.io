// Content for MildRinrada Town. Edit this file to add projects; the scene and the list view read from it.
//
// Placement uses the town grid: 1 unit = 1 road tile. `pos` is [x, z], `rot` is in degrees.
// The main street runs along z = 0; the front row of lots sits around z = -1.2.
//
// Images: put screenshots in assets/projects/<id>/ (see the README there).
// A missing image falls back to a "screenshot coming soon" frame, so nothing breaks.

export const site = {
  name: 'Rinrada',
  nickname: 'Mild',
  role: 'Full-Stack Developer',
  github: 'https://github.com/MildRinrada',
  email: '', // TODO: public contact email. The email button stays hidden while this is empty.
  linkedin: '', // TODO
  resume: 'assets/resume.pdf', // Drop the PDF here and the Résumé button appears on its own.
};

// Layer kinds drive the blueprint view and the stack chips in the panel:
// frontend (top floor) · backend (middle) · infra (ground floor) · data (basement, below the street)
export const LAYER_LABELS = {
  frontend: 'Frontend',
  backend: 'Backend',
  infra: 'Infra & tools',
  data: 'Database',
};

export const places = [
  {
    id: 'kawaiibake',
    kind: 'project',
    icon: '🧁',
    title: 'KawaiiBake',
    tagline: 'Full-stack bakery tutorial platform',
    category: 'Full-stack project',
    status: null, // 'live' | 'building' | null. TODO: confirm. Only 'live' lights the windows at night.
    at: { pos: [-2.75, -1.2], rot: 0 },
    model: { file: 'commercial/building-e.glb', scale: 1.05 },
    props: [
      { file: 'food/cupcake.glb', roof: true, at: [0.42, 0, 0.05], scale: 2.1, rot: 20 },
      { file: 'commercial/detail-parasol-a.glb', at: [-0.5, 0, 0.82], scale: 0.55 },
      { file: 'commercial/detail-parasol-b.glb', at: [0.05, 0, 0.82], scale: 0.55 },
    ],
    summary:
      'A Thai bakery learning platform designed as more than a recipe CRUD app: structured courses with enrolment-gated lessons, reusable quizzes, verifiable certificates, an AI baking assistant, a community gallery with Q&A, and learning that feels like a game.',
    highlights: [
      'API-only backend: 28 domain apps and 145 REST endpoints, organised into strict service, repository, selector and validator layers.',
      'OpenAPI contracts are generated from DRF and compiled into TypeScript, so a backend change shows up as a frontend type error.',
      'Gamified learning (XP, levels, streaks, badges, rewards) with progress derived from activity and checked by reconciliation jobs.',
      'Security built in: Argon2 hashing, rate limiting, enumeration-safe password recovery, threat monitoring with append-only evidence logs.',
      'Pluggable AI providers with an offline mock, and swappable authentication.',
    ],
    layers: [
      { kind: 'frontend', items: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS v4'] },
      { kind: 'backend', items: ['Python 3.12', 'Django 5', 'DRF', 'Celery'] },
      { kind: 'infra', items: ['Docker'] },
      { kind: 'data', items: ['PostgreSQL', 'Redis'] },
    ],
    links: { live: '', repo: '' }, // TODO
    media: { cover: 'assets/projects/kawaiibake/cover.webp' },
  },

  {
    id: 'bookdose',
    kind: 'work',
    icon: '🏢',
    title: 'Bookdose Co., Ltd.',
    tagline: 'Full-Stack Developer',
    period: 'Jul 2025 – Present',
    workMode: 'Hybrid',
    status: 'live', // a workplace in daily use, so its windows light up at night
    glow: 0.45, // the tower is mostly glass, so keep the night glow soft
    at: { pos: [0, -1.3], rot: 0 },
    model: { file: 'commercial/building-skyscraper-c.glb', scale: 1.15 },
    props: [],
    summary:
      'I build a full-stack online learning platform, working on both the frontend and the backend. I work with stakeholders to analyse requirements and design features, and deliver web applications tailored to the needs of government agencies.',
    highlights: [
      'Full-stack development of an online learning platform, frontend and backend.',
      'Requirements analysis and feature design together with stakeholders.',
      'Web applications delivered for government agencies, built and maintained to be scalable and easy to use.',
      'Quality and security as part of delivery, including security testing with OWASP ZAP.',
      'Workflow automation with n8n.',
    ],
    layers: [
      { kind: 'frontend', items: ['Next.js', 'JavaScript', 'HTML', 'CSS'] },
      { kind: 'backend', items: ['PHP', 'Python', 'Node.js', 'NestJS'] },
      { kind: 'infra', items: ['n8n', 'OWASP ZAP'] },
    ],
    links: {},
    media: { cover: 'assets/projects/bookdose/cover.webp' },
  },

  {
    id: 'next-lot',
    kind: 'lot',
    icon: '📐',
    at: { pos: [2.75, -1.2], rot: 0 },
    lot: { size: [1.8, 1.35], ghost: [1.15, 2.3, 0.9] },
  },
];
