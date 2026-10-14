// Skill matching for the JD Matcher and ?role= links. Runs entirely in the browser.
//
// Each skill has:
//   find   – how to spot it in a job description
//   have   – how to spot it in your own data (layer items in data/town.js and About skills)
//   places – extra buildings that prove it, for skills that aren't a single stack item
// A skill found in the job description but not in your data is reported honestly as a gap.

export const SKILLS = [
  // languages
  { name: 'TypeScript', find: /\btypescript\b/i, have: /^typescript/i },
  { name: 'JavaScript', find: /\bjavascript\b|\bes6\b|\bjs\b(?!on)/i, have: /^javascript/i },
  { name: 'Python', find: /\bpython\b/i, have: /^python/i },
  { name: 'Go', find: /\bgolang\b|(?:^|[\s,/(])Go(?=[,/)]|\s+(?:and|or|developer|engineer|language)\b|\s*$)/m, have: /^(go|gin|gorm)$/i },
  { name: 'PHP', find: /\bphp\b/i, have: /^php/i },
  { name: 'C#', find: /(?:^|[^a-z])c#|\bcsharp\b/i, have: /^c#$/i },
  { name: 'SQL', find: /\bsql\b/i, have: /sql|postgres/i },
  { name: 'HTML & CSS', find: /\bhtml5?\b|\bcss3?\b/i, have: /^(html|css)$/i },
  { name: 'Java', find: /\bjava\b(?!script)/i, have: /^java$/i },
  { name: 'Kotlin', find: /\bkotlin\b/i, have: /^kotlin/i },
  { name: 'Swift', find: /\bswift\b/i, have: /^swift/i },
  { name: 'Rust', find: /\brust\b/i, have: /^rust/i },
  { name: 'Ruby', find: /\bruby\b|\brails\b/i, have: /^ruby|rails/i },

  // frontend
  { name: 'React', find: /\breact(?:\.js|js)?\b(?!\s*native)/i, have: /^react\b(?!\s*native)/i },
  { name: 'Next.js', find: /\bnext\.?js\b|\bnext js\b/i, have: /^next\.?js/i },
  { name: 'Angular', find: /\bangular(?:js)?\b/i, have: /^angular/i },
  { name: 'Vue', find: /\bvue(?:\.js|js)?\b|\bnuxt\b/i, have: /^vue|nuxt/i },
  { name: 'Tailwind CSS', find: /\btailwind\b/i, have: /^tailwind/i },
  { name: 'Bootstrap', find: /\bbootstrap\b/i, have: /^bootstrap/i },
  { name: 'React Native', find: /\breact\s*native\b/i, have: /^react native/i },
  { name: 'Flutter', find: /\bflutter\b|\bdart\b/i, have: /^flutter|dart/i },

  // backend
  { name: 'Node.js', find: /\bnode(?:\.js|js)?\b/i, have: /^(node|nestjs)/i },
  { name: 'NestJS', find: /\bnest\.?js\b/i, have: /^nestjs/i },
  { name: 'Express', find: /\bexpress(?:\.js|js)?\b/i, have: /^express/i },
  { name: 'Django', find: /\bdjango\b|\bdrf\b/i, have: /^(django|drf)/i },
  { name: 'FastAPI', find: /\bfastapi\b/i, have: /fastapi/i },
  { name: 'Flask', find: /\bflask\b/i, have: /^flask/i },
  { name: 'ASP.NET / .NET', find: /\basp\.?net\b|(?:^|\s)\.net\b|\bdotnet\b/i, have: /asp\.net|ef core|^c#$/i },
  { name: 'Laravel', find: /\blaravel\b/i, have: /^laravel/i },
  { name: 'Spring Boot', find: /\bspring(?:\s*boot)?\b/i, have: /^spring/i },
  { name: 'REST APIs', find: /\brest(?:ful)?\b|\bapis?\b/i, have: /^$/, places: ['kawaiibake', 'happy-paws-clinic', 'securesight', 'fictionthai', 'customer-service', 'mewbark-ai'] },
  { name: 'OpenAPI / Swagger', find: /\bopenapi\b|\bswagger\b/i, have: /^openapi/i, places: ['kawaiibake', 'happy-paws-clinic'] },
  { name: 'GraphQL', find: /\bgraphql\b/i, have: /^graphql/i },
  { name: 'WebSocket / real-time', find: /\bwebsockets?\b|\bsocket\.io\b|\breal-?time\b/i, have: /websocket/i },
  { name: 'ORM', find: /\borm\b|\bprisma\b|\bsqlalchemy\b|\bentity framework\b|\bef core\b|\bgorm\b/i, have: /prisma|gorm|ef core|sqlalchemy/i },
  { name: 'Background jobs & queues', find: /\bcelery\b|\bbullmq\b|\bjob queues?\b|\bmessage queues?\b|\bbackground (?:jobs?|tasks?)\b/i, have: /celery|bullmq/i },
  { name: 'Kafka / RabbitMQ', find: /\bkafka\b|\brabbitmq\b/i, have: /kafka|rabbitmq/i },
  { name: 'Testing', find: /\bunit tests?\b|\btesting\b|\bjest\b|\bpytest\b|\btdd\b|\bautomated tests?\b/i, have: /^(jest|pytest)/i, places: ['happy-paws-clinic', 'customer-service'] },

  // data
  { name: 'PostgreSQL', find: /\bpostgres(?:ql)?\b/i, have: /^postgres/i },
  { name: 'MySQL', find: /\bmysql\b|\bmariadb\b/i, have: /^mysql/i },
  { name: 'SQLite', find: /\bsqlite\b/i, have: /^sqlite/i },
  { name: 'MongoDB', find: /\bmongo(?:db)?\b/i, have: /^mongo/i },
  { name: 'Redis', find: /\bredis\b/i, have: /^redis/i },
  { name: 'Elasticsearch', find: /\belastic(?:search)?\b/i, have: /^elastic/i },

  // infra
  { name: 'Docker', find: /\bdocker\b|\bcontaineri[sz]ation\b|\bcontainers?\b/i, have: /docker/i },
  { name: 'Kubernetes', find: /\bkubernetes\b|\bk8s\b/i, have: /^kubernetes/i },
  { name: 'Nginx', find: /\bnginx\b/i, have: /^nginx/i },
  { name: 'Git', find: /\bgit\b|\bgithub\b|\bgitlab\b/i, have: /^git/i },
  { name: 'CI/CD', find: /\bci\s*\/\s*cd\b|\bgithub actions\b|\bjenkins\b|\bgitlab ci\b/i, have: /^ci\/cd|github actions/i },
  { name: 'Cloud (AWS / GCP / Azure)', find: /\baws\b|amazon web services|\bgcp\b|google cloud|\bazure\b/i, have: /^(aws|gcp|azure)/i },
  { name: 'Linux', find: /\blinux\b|\bubuntu\b/i, have: /^linux/i },

  // security & domains
  { name: 'Web security / OWASP', find: /\bowasp\b|\bsecurity\b|\bvulnerabilit(?:y|ies)\b|\bpenetration\b|\bpentest/i, have: /owasp/i, places: ['securesight', 'kawaiibake', 'customer-service'] },
  { name: 'Auth (JWT / OAuth / 2FA)', find: /\bjwt\b|\boauth\b|\bsso\b|\bauthenticat(?:e|ion)\b|\b2fa\b|\bmfa\b/i, have: /^(jwt|nextauth)/i, places: ['securesight', 'happy-paws-clinic', 'kawaiibake', 'customer-service'] },
  { name: 'Machine learning / NLP', find: /\bmachine learning\b|\bml\b|\bnlp\b|\bnatural language\b|\bscikit|\bclassification\b/i, have: /naive bayes|attacut|ml services/i },
  { name: 'AI / LLM', find: /\bllms?\b|\bgen(?:erative)?\s*ai\b|\bopenai\b|\bgpt\b|\bchatbots?\b|\bai\b/i, have: /openai|pgvector/i, places: ['fictionthai', 'kawaiibake', 'customer-service'] },
  { name: 'Chatbots / NLU', find: /chat ?bots?|dialogflow|nlu|conversational/i, have: /dialogflow/i, places: ['line-movie-bot', 'mewbark-ai', 'customer-service'] },
  { name: 'LINE Messaging API', find: /\bline\s*(?:oa|official account|messaging|api|bot|liff)\b|\bliff\b/i, have: /^line /i },
  { name: 'Workflow automation (n8n)', find: /\bn8n\b|\bworkflow automation\b|\bzapier\b/i, have: /^n8n/i },
  { name: 'Figma', find: /\bfigma\b/i, have: /^figma/i },
  { name: 'Photoshop', find: /\bphotoshop\b/i, have: /photoshop/i },
];

// What each ?role= link asks for. Gaps are real gaps, so only list what the role truly needs.
export const ROLES = {
  frontend: ['TypeScript', 'JavaScript', 'React', 'Next.js', 'Angular', 'Tailwind CSS', 'HTML & CSS', 'REST APIs', 'Git'],
  backend: ['Python', 'Go', 'Node.js', 'NestJS', 'Django', 'FastAPI', 'ASP.NET / .NET', 'PHP', 'REST APIs', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Background jobs & queues', 'Auth (JWT / OAuth / 2FA)'],
  fullstack: ['TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'Go', 'REST APIs', 'PostgreSQL', 'Redis', 'Docker', 'Git', 'Auth (JWT / OAuth / 2FA)'],
  security: ['Web security / OWASP', 'Auth (JWT / OAuth / 2FA)', 'Go', 'Python', 'Docker', 'Nginx', 'REST APIs'],
  ai: ['Python', 'Machine learning / NLP', 'AI / LLM', 'FastAPI', 'PostgreSQL', 'LINE Messaging API'],
};

const byName = new Map(SKILLS.map((s) => [s.name, s]));

// Which buildings (and whether your About skills) back up a skill.
export function evidence(skill, places, site) {
  const ids = new Set(skill.places ?? []);
  for (const p of places) for (const l of p.layers ?? []) if (l.items.some((i) => skill.have.test(i))) ids.add(p.id);
  const listed = site.about.skills.some((g) => g.items.some((i) => skill.have.test(i)));
  return { ids: [...ids].filter((id) => places.some((p) => p.id === id)), listed };
}

// Match a list of skills against your work. Returns per-skill results, a score and per-building counts.
export function matchSkills(skills, places, site) {
  const results = skills.map((skill) => {
    const ev = evidence(skill, places, site);
    return { skill, ...ev, has: ev.ids.length > 0 || ev.listed };
  });
  const have = results.filter((r) => r.has);
  const perPlace = new Map();
  for (const r of have) for (const id of r.ids) perPlace.set(id, (perPlace.get(id) ?? 0) + 1);
  return {
    results,
    have,
    gaps: results.filter((r) => !r.has),
    score: results.length ? Math.round((have.length / results.length) * 100) : 0,
    perPlace,
  };
}

export const detectSkills = (text) => SKILLS.filter((s) => s.find.test(text));
export const roleSkills = (role) => (ROLES[role] ?? []).map((n) => byName.get(n)).filter(Boolean);
