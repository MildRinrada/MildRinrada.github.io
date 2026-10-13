// Content for MildRinrada Town. Edit this file to add projects; the scene and the list view read from it.
//
// Placement uses the town grid: 1 unit = 1 road tile. `pos` is [x, z], `rot` is in degrees.
// Two streets run along x: Main Street at z = 0 and Park Street at z = 3.
// Row 1 (tall buildings) sits behind Main Street at z ≈ -1.3; row 2 sits between the streets at z ≈ 1.6.
//
// Images: every project folder in assets/projects/<id>/ already holds template images (01.png, 02.png, …).
// Overwrite them with your screenshots and keep the file names. To add more, drop 04.png next to them
// and add a line to that place's media.images below. See assets/projects/README.md.
//
// status: 'live' (lights on at night) · 'building' (scaffolding, optional progress) · null (no badge)

export const site = {
  name: 'Rinrada',
  nickname: 'Mild',
  role: 'Full-Stack Developer',
  github: 'https://github.com/MildRinrada',
  url: 'https://mildrinrada.github.io/', // printed on the CV as the interactive version
  email: '', // TODO: public contact email. The email button stays hidden while this is empty.
  linkedin: '', // TODO
  resume: 'assets/resume.pdf', // Drop the PDF here and the Résumé button appears on its own.
  photo: 'assets/profile/photo.png', // Your photo: square, about 800 × 800. Overwrite the template file.
  // The little character who walks around town and opens About me when clicked.
  // 12 to choose from: characters/character-female-a … f and characters/character-male-a … f.
  // Preview them live: press the ` key to open the terminal and type  avatar list
  avatar: 'characters/character-female-e.glb',
  about: {
    headline: 'I build web apps end to end, from the storefront down to the database.',
    bio: [
      'I care about intuitive, scalable and user-focused web applications, and I like owning the whole path: understanding requirements with stakeholders, designing the API, and shipping both the frontend and the backend.',
      'I also design and build my own platforms to go deeper on architecture, security and developer experience.',
      'My goal is to grow into a technical leader who ships high-quality systems and helps the team around them do the same.',
    ],
    education: { degree: 'B.Sc. Computer Science', school: "Faculty of Science, King Mongkut's Institute of Technology Ladkrabang (KMITL)" },
    // Review this list: it combines your CV with the stacks used in your projects.
    skills: [
      { label: 'Languages', items: ['TypeScript', 'JavaScript', 'Python', 'Go', 'PHP', 'C#', 'SQL', 'HTML', 'CSS'] },
      { label: 'Frameworks', items: ['Next.js', 'React', 'Node.js', 'NestJS', 'Django', 'FastAPI', 'Flask', 'ASP.NET Core', 'Angular', 'Gin', 'Tailwind CSS'] },
      { label: 'Data & infra', items: ['PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Nginx', 'Git', 'GitHub'] },
      { label: 'Tools', items: ['n8n', 'OWASP ZAP', 'Herd', 'XAMPP', 'Adobe Photoshop'] },
    ],
  },
};

// Layer kinds drive the blueprint view and the stack chips in the panel:
// frontend (top floor) · backend (middle) · infra (ground floor) · data (basement, below the street)
export const LAYER_LABELS = {
  frontend: 'Frontend',
  backend: 'Backend',
  infra: 'Infra & tools',
  data: 'Database',
};

// gallery('kawaiibake', 3) → 01.png, 02.png, 03.png in assets/projects/kawaiibake/.
// Without captions the panel says "Cover" / "Screenshot 2". To describe a screen, write the list out instead:
//   media: { images: [{ src: 'assets/projects/kawaiibake/01.png', caption: 'Course page' }, …] }
const gallery = (id, count) => ({
  images: Array.from({ length: count }, (_, i) => ({ src: `assets/projects/${id}/${String(i + 1).padStart(2, '0')}.png` })),
});

export const places = [
  // ---------------- row 1, behind Main Street ----------------
  {
    id: 'kmitl',
    kind: 'education',
    icon: '🎓',
    title: 'KMITL',
    tagline: 'B.Sc. Computer Science',
    status: null,
    at: { pos: [-5.4, -1.35] },
    model: { file: 'commercial/building-n.glb', scale: 0.72 },
    summary: "Bachelor of Science in Computer Science, Faculty of Science, King Mongkut's Institute of Technology Ladkrabang. Where the road through town starts.",
    highlights: ['Special problem project: Laptop Recommendation, a web app driven by a rule-based expert system.'],
    layers: [],
  },
  {
    id: 'fictionthai',
    kind: 'project',
    icon: '📚',
    title: 'FictionThai',
    tagline: 'Full-stack novel & writing platform',
    category: 'Solo full-stack project',
    status: 'building',
    statusNote: 'In development, running locally',
    at: { pos: [-3.6, -1.3] },
    model: { file: 'commercial/building-g.glb', scale: 1 },
    summary:
      'A Thai fiction platform I designed and built from scratch on my own. One story can be published as prose or as chat-style fiction, and switching format only changes metadata, never the original writing.',
    highlights: [
      'Flexible formats: one story supports both prose and chat-style content without rewriting a word.',
      'Guest-first reading, writer studios, multiple pen names and privacy-focused visibility controls.',
      'Community features with moderation and audit systems, plus secure file handling.',
      'AI as an assistant, not a replacement: Thai spelling, repetition, summarisation and character-consistency checks that writers accept or reject. AI runs locally and never trains on user content.',
      'API designed independently from the UI, ready for future mobile clients.',
    ],
    layers: [
      { kind: 'frontend', items: ['Next.js', 'TypeScript', 'Tailwind CSS'] },
      { kind: 'backend', items: ['Go', 'Gin', 'FastAPI ML services (optional)'] },
      { kind: 'data', items: ['PostgreSQL', 'Redis'] },
    ],
    links: { live: '', repo: '' },
    media: gallery('fictionthai', 3),
  },
  {
    // TODO: the source repo is named "Bookdose Customer Service". Confirm you may publish it before going live.
    id: 'customer-service',
    kind: 'project',
    icon: '💬',
    title: 'Omnichannel Customer Service',
    short: 'Customer Service', // the pin label in town
    tagline: 'One inbox for every channel, for many organisations',
    category: 'Full-stack project',
    status: null,
    at: { pos: [-1.8, -1.3] },
    model: { file: 'commercial/building-f.glb', scale: 1 },
    summary:
      'A Thai web-based customer service system that serves many organisations from one install. Each organisation receives web chat, LINE, email, Facebook and Instagram messages in a single inbox, opens cases, tracks SLA response times, and works with a knowledge base, automations, reports and an AI assistant.',
    highlights: [
      'A single inbox for web chat, LINE, email, Facebook and Instagram.',
      'Cases with SLA timers, a knowledge base, automations and reports.',
      'Multi-organisation by design: a separate SQLite database per organisation plus one central database.',
      'Live updates over WebSocket; the Next.js frontend forwards every /api request to the FastAPI backend.',
      'Documented roles and permissions, data isolation, secret storage and request protection.',
    ],
    layers: [
      { kind: 'frontend', items: ['Next.js 16', 'React 19', 'TypeScript'] },
      { kind: 'backend', items: ['Python', 'FastAPI', 'WebSocket'] },
      { kind: 'data', items: ['SQLite per organisation'] },
    ],
    links: { live: '', repo: '' },
    media: gallery('customer-service', 3),
  },
  {
    id: 'bookdose',
    kind: 'work',
    icon: '🏢',
    title: 'Bookdose Co., Ltd.',
    short: 'Bookdose',
    tagline: 'Full-Stack Developer',
    period: 'Jul 2025 – Present',
    workMode: 'Hybrid',
    status: 'live', // a workplace in daily use, so its windows light up at night
    glow: 0.45, // the tower is mostly glass, so keep the night glow soft
    at: { pos: [0, -1.35] },
    model: { file: 'commercial/building-skyscraper-c.glb', scale: 1.15 },
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
  },
  {
    id: 'securesight',
    kind: 'project',
    icon: '🛡️',
    title: 'SecureSight',
    tagline: 'Web security scanning & risk management',
    category: 'Full-stack project',
    status: null,
    at: { pos: [1.8, -1.3] },
    model: { file: 'commercial/building-m.glb', scale: 1 },
    summary:
      'A passive web security assessment platform. It evaluates websites through normal HTTP requests and responses, never attacking or modifying the target, and helps teams prioritise fixes by risk and business impact rather than isolated findings.',
    highlights: [
      'Analyses security headers, cookies, CORS, TLS configuration, redirects and web technologies.',
      'Explains each finding in the context of the overall security posture, not just what is missing.',
      'Modular checks, crawling, fingerprinting, risk scoring, triage, team assignment, notifications, scan comparison and scheduled scans.',
      'Role-based access control, two-factor authentication, audit logging and machine-to-machine API access.',
      'Reports in PDF, HTML, JSON and CSV, with multilingual support.',
    ],
    layers: [
      { kind: 'frontend', items: ['Angular', 'Angular Material', 'Chart.js'] },
      { kind: 'backend', items: ['Go', 'Gin', 'GORM', 'JWT', 'SMTP'] },
      { kind: 'infra', items: ['Docker Compose', 'Nginx'] },
      { kind: 'data', items: ['MySQL'] },
    ],
    links: { live: '', repo: '' },
    media: gallery('securesight', 3),
  },
  {
    id: 'next-lot',
    kind: 'lot',
    icon: '📐',
    at: { pos: [3.6, -1.3] },
    lot: { size: [1.7, 1.35], ghost: [1.1, 2.3, 0.9] },
  },
  {
    id: 'laptop-recommendation',
    kind: 'project',
    icon: '💻',
    title: 'Laptop Recommendation',
    short: 'Laptop Advisor',
    tagline: 'Web app with a rule-based expert system',
    category: 'Special problem project · KMITL',
    status: null,
    at: { pos: [5.4, -1.3] },
    model: { file: 'commercial/building-c.glb', scale: 1.1 },
    summary:
      'A web application that suggests efficient, suitable laptops. Users give some basic information, and a rule-based expert system analyses the specifications of each laptop to recommend the best matches.',
    highlights: ['Data processing over laptop specifications.', 'A rule-based expert system that matches what users need to the right specs.'],
    layers: [], // TODO: add the stack you used
    links: { live: '', repo: '' },
    media: gallery('laptop-recommendation', 3),
  },

  // ---------------- row 2, between Main Street and Park Street ----------------
  {
    id: 'nk-digital-library',
    kind: 'project',
    icon: '🏫',
    title: 'NK Digital Library',
    short: 'NK Library',
    tagline: 'Official website of Matthayom Wat Nongkhaem School',
    category: 'Website',
    status: 'live',
    at: { pos: [-5.0, 1.6] },
    model: { file: 'commercial/building-k.glb', scale: 1 },
    summary: 'I developed and maintained the official website for Matthayom Wat Nongkhaem School, on both the frontend and the backend.',
    highlights: [
      'Implemented both the frontend (HTML, CSS, Bootstrap) and the backend (PHP).',
      'Worked with the team to fix bugs, optimise performance and keep the system stable.',
    ],
    layers: [
      { kind: 'frontend', items: ['HTML', 'CSS', 'Bootstrap'] },
      { kind: 'backend', items: ['PHP'] },
    ],
    links: { live: '' }, // TODO: live URL
    media: gallery('nk-digital-library', 3),
  },
  {
    id: 'thai-breastfeeding-center',
    kind: 'project',
    icon: '🍼',
    title: 'Thai Breastfeeding Center Foundation',
    short: 'Breastfeeding Center',
    tagline: 'Official foundation website',
    category: 'Website',
    status: 'live',
    at: { pos: [-3.0, 1.55] },
    model: { file: 'suburban/building-type-f.glb', scale: 0.95 },
    summary: 'I developed and maintained the official website for the Thai Breastfeeding Center Foundation, on both the frontend and the backend.',
    highlights: [
      'Implemented both the frontend (HTML, CSS, Bootstrap) and the backend (PHP).',
      'Worked with the team to fix bugs, optimise performance and keep the system stable.',
    ],
    layers: [
      { kind: 'frontend', items: ['HTML', 'CSS', 'Bootstrap'] },
      { kind: 'backend', items: ['PHP'] },
    ],
    links: { live: '' }, // TODO: live URL
    media: gallery('thai-breastfeeding-center', 3),
  },
  {
    id: 'kawaiibake',
    kind: 'project',
    icon: '🧁',
    title: 'KawaiiBake',
    tagline: 'Full-stack bakery tutorial platform',
    category: 'Full-stack project',
    status: null, // TODO: confirm. Only 'live' lights the windows at night.
    at: { pos: [-1.0, 1.6] },
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
    links: { live: '', repo: '' },
    media: gallery('kawaiibake', 3),
  },
  {
    id: 'happy-paws-clinic',
    kind: 'project',
    icon: '🐾',
    title: 'Happy Paws Clinic',
    short: 'Happy Paws',
    tagline: 'Veterinary clinic management system',
    category: 'Full-stack project',
    status: 'building',
    progress: { value: 123, total: 164, label: 'API endpoints built, with tests' },
    at: { pos: [1.0, 1.6] },
    model: { file: 'commercial/building-a.glb', scale: 1 },
    summary:
      "Covers a clinic's whole day: customers book, check in, wait to be called, see the vet, get their medical record written, pay and receive a receipt. Plus everything behind it: branches, staff, services, customers and pets.",
    highlights: [
      'Contract-first API: 164 endpoints in the contract, 123 built with tests, and 21 extra endpoints each documented with a reason.',
      'Daily operations complete in the API: booking, queue, examination, medical records, invoices, payments and receipts.',
      'Ongoing care: vaccines, weight charts, labs, medication history, treatment plans, document uploads, PDFs and advanced appointments.',
      'Customer sign-up with phone number and OTP; staff sign-in with password plus an authenticator app.',
      'The browser only talks to the Next.js server, which keeps the API token in a cookie JavaScript cannot read.',
    ],
    layers: [
      { kind: 'frontend', items: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS 4'] },
      { kind: 'backend', items: ['C#', 'ASP.NET Core 10', 'EF Core 10'] },
      { kind: 'infra', items: ['Docker Compose'] },
      { kind: 'data', items: ['PostgreSQL 17'] },
    ],
    links: { live: '', repo: '' },
    media: gallery('happy-paws-clinic', 3),
  },
  {
    // The project README spells it "MeowBark AI". Pick one spelling and use it everywhere.
    id: 'mewbark-ai',
    kind: 'project',
    icon: '🐱',
    title: 'MewBark AI',
    tagline: 'AI pet companion on LINE',
    category: 'Full-stack project',
    status: 'building',
    progress: { value: 3, total: 8, label: 'build phases complete' },
    at: { pos: [2.9, 1.6] },
    model: { file: 'suburban/building-type-a.glb', scale: 1 },
    summary:
      'An AI pet companion that lives inside LINE. Owners keep a journal for each pet, set reminders and chat with an assistant, with a safety layer in front of the language model.',
    highlights: [
      'LINE webhook and rich menu, authentication, users and pet profiles.',
      'Pet journal with media uploads, reminders and a scheduler.',
      'A safety layer in front of the LLM chat.',
      'Deterministic pet resolution: an explicit mention, then an exact name or nickname, then the last pet discussed, then the only pet.',
      'UI built before the data pipelines on purpose: each card is a contract for what the pipeline has to produce.',
    ],
    layers: [
      { kind: 'frontend', items: ['LINE Messaging API', 'Rich menu', 'Flex cards'] },
      { kind: 'backend', items: ['NestJS 10', 'TypeScript', 'Prisma', 'BullMQ', 'OpenAI'] },
      { kind: 'infra', items: ['Docker Compose', 'S3-compatible storage'] },
      { kind: 'data', items: ['PostgreSQL 16 + pgvector', 'Redis 7'] },
    ],
    links: { live: '', repo: '' },
    media: gallery('mewbark-ai', 3),
  },
  {
    id: 'thai-emotion-detection',
    kind: 'project',
    icon: '🔮',
    title: 'Thai Emotion Detection',
    short: 'Emotion AI',
    tagline: 'Reads a Thai sentence and names the feeling',
    category: 'Machine learning project',
    status: null,
    at: { pos: [4.8, 1.6] },
    model: { file: 'commercial/building-d.glb', scale: 0.9 },
    summary: 'A web application that classifies Thai sentences into four emotions: happiness, sadness, love and anger.',
    highlights: [
      'Naive Bayes classifier with Thai word segmentation by attacut.',
      'The trained model is saved and reused, so the app never retrains on start-up.',
      'Trained on an Excel dataset of labelled Thai sentences.',
    ],
    layers: [
      { kind: 'frontend', items: ['HTML', 'CSS'] },
      { kind: 'backend', items: ['Python', 'Flask', 'Naive Bayes', 'attacut'] },
    ],
    links: { live: '', repo: '' },
    media: gallery('thai-emotion-detection', 4),
  },
];
