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
// icon: a file name in assets/icons/ (Fluent UI System Icons, colour set, MIT licence)

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
    education: { degree: 'B.Sc. Computer Science, First Class Honors (GPAX 3.56)', school: "Faculty of Science, King Mongkut's Institute of Technology Ladkrabang (KMITL)" },
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
    icon: 'certificate',
    title: 'KMITL',
    tagline: 'B.Sc. Computer Science · First Class Honors',
    period: 'Aug 2020 – May 2024',
    status: null,
    at: { pos: [-5.4, -1.35] },
    model: { file: 'commercial/building-n.glb', scale: 0.72 },
    summary: "Bachelor of Science in Computer Science with First Class Honors, Faculty of Science, King Mongkut's Institute of Technology Ladkrabang, 2020–2024. Where the road through town starts.",
    highlights: [
      'First Class Honors, with a cumulative GPA of 3.56 over 136 credits.',
      'Special problem project: Laptop Recommendation, a web app driven by a rule-based expert system.',
    ],
    layers: [],
    // The transcript, with the date of birth and student ID covered. Keep the unredacted original off the site.
    media: {
      images: [{ src: 'assets/projects/kmitl/transcript.pdf', type: 'pdf', caption: { en: 'Transcript of records', th: 'ใบแสดงผลการศึกษา' } }],
    },
  },
  {
    id: 'fictionthai',
    kind: 'project',
    icon: 'book_open',
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
    // Written from C:\Customer Service Github (README, docs/architecture.md, docs/features, docs/security).
    id: 'customer-service',
    kind: 'project',
    icon: 'chat_multiple',
    title: 'Bookdose Customer Service',
    short: 'Customer Service', // the pin label in town
    tagline: 'Customer service platform for many organisations',
    category: 'Full-stack project',
    status: null,
    at: { pos: [-1.8, -1.3] },
    model: { file: 'commercial/building-f.glb', scale: 1 },
    summary:
      'A Thai customer service platform where many organisations share one system, each with its own database. Teams answer web chat, LINE, email, Facebook and Instagram from one inbox, work tickets against SLAs, and lean on a knowledge base, automations, reports and AI. Customers get a support page, guest chat, a chat button for their own website, and one account that works with every organisation.',
    highlights: [
      'About 400 API routes across 31 backend modules, covered by 585 automated tests.',
      'Inbox and tickets: every channel in one place, internal notes and @mentions, six ticket states, SLAs with business hours and holidays, auto-assignment, escalation, macros, CSAT surveys and auto-close.',
      'AI that each organisation connects with its own key: reply drafts that cite knowledge-base articles, rewriting, tag and priority suggestions, a chatbot on web, LINE and email, an assistant that can act on tickets, summaries, sentiment and translation.',
      'Reports that forecast ticket volume and the staff needed each day, plus team-spirit touches: an inbox weather forecast, a kudos wall, monthly recaps and achievements.',
      'Security in depth: a separate SQLite database per organisation, encrypted secrets, passkeys and two-step sign-in, CSRF protection, a fresh CSP nonce on every page, rate limits, Turnstile, honeypots and honeytokens.',
      'Next.js forwards every /api call and WebSocket to FastAPI, where one catch-all route feeds a custom dispatcher: access-level middleware, then controller, service and repository.',
    ],
    layers: [
      { kind: 'frontend', items: ['Next.js 16', 'React 19', 'TypeScript', 'TanStack Query'] },
      { kind: 'backend', items: ['Python', 'FastAPI', 'uvicorn', 'WebSocket'] },
      { kind: 'infra', items: ['LINE Messaging API', 'Facebook & Instagram', 'IMAP / SMTP'] },
      { kind: 'data', items: ['SQLite, one per organisation'] },
    ],
    links: { live: '', repo: '' },
    // The demo video plays first. Overwrite demo.mp4 with your own video and keep the name.
    // Pictures stay as they are: 01.png is still the cover in the list view and the CV.
    media: {
      images: [{ src: 'assets/projects/customer-service/demo.mp4', type: 'video' }, ...gallery('customer-service', 4).images],
    },
  },
  {
    id: 'bookdose',
    kind: 'work',
    icon: 'building',
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
    icon: 'shield_checkmark',
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
    icon: 'lightbulb_filament',
    at: { pos: [3.6, -1.3] },
    lot: { size: [1.7, 1.35], ghost: [1.1, 2.3, 0.9] },
  },
  {
    id: 'laptop-recommendation',
    kind: 'project',
    icon: 'laptop',
    title: 'Laptop Recommendation',
    short: 'Laptop Advisor',
    // Written from C:\Portfolio Project\Web-Application-For-Laptops-Recommendation (README, docs/UI.md, app/).
    tagline: 'Laptop advice from a rule-based expert system',
    category: 'Special problem project · KMITL',
    status: null,
    at: { pos: [5.4, -1.3] },
    model: { file: 'commercial/building-c.glb', scale: 1.1 },
    summary:
      'A web application that helps people choose a laptop. It asks one question at a time (budget, how the laptop will be used, operating system, touchscreen), runs the answers through a rule-based expert system, and lists the models that fit. Visitors can also browse a catalog by brand, filter it, open full specs and compare two models side by side.',
    highlights: [
      'Rule-based expert system: a step-by-step question flow that ends in one of 18 rules, each matched to the laptops tagged with it in the database.',
      'Catalog for 7 brands (Acer, Apple, Asus, Dell, HP, Lenovo, MSI) with model search, instant price sorting, and filters for brand, price, RAM and storage that work without reloading and apply to whatever is on screen, recommendation results included.',
      'Detail pages with CPU, GPU, RAM, storage, display, ports, pros and cons and where to buy, plus a side-by-side comparison of two models.',
      'Flask with an application factory and blueprints, split into routes, a repository layer that keeps every query in shared functions using parameterised SQL, and Jinja2 template inheritance.',
      'MySQL schema of 8 tables. The real questionnaire responses stay private; the repository ships only code, schema and made-up seed data.',
    ],
    layers: [
      { kind: 'frontend', items: ['Jinja2', 'HTML', 'CSS', 'jQuery'] },
      { kind: 'backend', items: ['Python', 'Flask', 'SQLAlchemy'] },
      { kind: 'infra', items: ['EmailJS'] },
      { kind: 'data', items: ['MySQL / MariaDB'] },
    ],
    links: { live: '', repo: 'https://github.com/MildRinrada/Web-Application-For-Laptops-Recommendation' },
    media: gallery('laptop-recommendation', 3),
  },

  // ---------------- row 2, between Main Street and Park Street ----------------
  {
    id: 'nk-digital-library',
    kind: 'project',
    icon: 'library',
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
    links: { live: 'https://elib.nk.ac.th/' },
    media: gallery('nk-digital-library', 3),
  },
  {
    id: 'thai-breastfeeding-center',
    kind: 'project',
    icon: 'person_heart',
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
    links: { live: 'https://thaibf.belib.app/' },
    media: gallery('thai-breastfeeding-center', 3),
  },
  {
    id: 'kawaiibake',
    kind: 'project',
    icon: 'building_store',
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
    media: gallery('kawaiibake', 4),
  },
  {
    id: 'happy-paws-clinic',
    kind: 'project',
    icon: 'animal_paw_print',
    title: 'Happy Paws Clinic',
    short: 'Happy Paws',
    tagline: 'Veterinary clinic management system',
    category: 'Full-stack project',
    status: 'building',
    progress: { value: 123, total: 164, label: 'API endpoints built, with tests' },
    at: { pos: [0.9, 1.6] },
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
    // Hidden until there is more to show. Delete the next line to put it back in town.
    hidden: true,
    id: 'mewbark-ai',
    kind: 'project',
    icon: 'bot_sparkle',
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
    icon: 'person_feedback',
    title: 'Thai Emotion Detection',
    short: 'Emotion AI',
    tagline: 'Reads a Thai sentence and names the feeling',
    category: 'Machine learning project',
    status: null,
    at: { pos: [2.4, 1.6] },
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
    media: gallery('thai-emotion-detection', 3),
  },
  {
    // Written from https://github.com/MildRinrada/Movie-Recommendation-Bot-Line and the project deck.
    id: 'line-movie-bot',
    kind: 'project',
    icon: 'video',
    title: 'LINE Chatbot “วันนี้ดูอะไร”',
    short: 'Movie Bot',
    tagline: 'A LINE chatbot that recommends movies',
    category: 'Chatbot project',
    status: null,
    at: { pos: [3.9, 1.6] },
    model: { file: 'commercial/building-h.glb', scale: 0.85 },
    summary:
      'A LINE chatbot that suggests what to watch. Users ask by genre, language, year, any mix of the three, or just for a surprise, and the bot picks a matching film and sends its poster, title, where to watch it, a description and a button to the trailer.',
    highlights: [
      'Recommends films by preferred genre, language and year, or picks one at random when the user has no preference.',
      'Dialogflow understands the request and a Node.js (Express) webhook built with dialogflow-fulfillment chooses a film that matches every condition.',
      'Replies as a LINE buttons template: poster, title, where to watch and a "watch the trailer" button, followed by the film’s description.',
      'Film data from a CSV of about 200 titles, each with a poster, description, release year, language and up to three genres.',
    ],
    layers: [
      { kind: 'frontend', items: ['LINE Messaging API', 'Buttons template'] },
      { kind: 'backend', items: ['Node.js', 'Express', 'Dialogflow', 'dialogflow-fulfillment'] },
      { kind: 'data', items: ['CSV dataset'] },
    ],
    links: { live: '', repo: 'https://github.com/MildRinrada/Movie-Recommendation-Bot-Line' },
    // A PDF shows its first page as the thumbnail, with buttons to open and download it.
    media: { images: [{ src: 'assets/projects/line-movie-bot/project-AI.pdf', type: 'pdf' }] },
  },
  {
    id: 'kpop-mart',
    kind: 'project',
    icon: 'headphones',
    title: 'K-Pop Mart Thailand',
    short: 'K-Pop Mart',
    tagline: 'UI design for an online K-pop album store',
    category: 'UI design · University group project',
    status: null,
    at: { pos: [5.75, 1.6] },
    model: { file: 'commercial/building-b.glb', scale: 0.9 },
    summary:
      'A university group project: the design of an online shop for K-pop albums, made in Figma. It covers browsing albums by cover art, weekly best-sellers, search, a wishlist, a cart and notifications, in both Thai and English.',
    highlights: [
      'Album-first browsing: a cover-art grid with title, artist and price in baht, plus a heart to add to the wishlist.',
      'Weekly best-sellers, search, cart, notifications and a signed-in profile in the top bar.',
      'A side menu for home, favourites, profile, settings and help, with a Thai / English switch.',
      // TODO: add what you did in the team, e.g. which screens you designed or the user research you ran.
    ],
    layers: [{ kind: 'frontend', items: ['Figma', 'UI design', 'Prototype'] }],
    // The design opens in Figma's read-only viewer (embed link), so visitors can look but not edit.
    links: {
      design: 'https://embed.figma.com/design/f1noWusGb4P6HAkWi5XBJZ?node-id=1075-10278&embed-host=share',
    },
    media: gallery('kpop-mart', 5),
  },
];
