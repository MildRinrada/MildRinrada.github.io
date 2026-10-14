// Interface text in English and Thai, plus helpers that pick the Thai version of content when it exists.
// Content (project summaries etc.) lives in data/town.js (English) and data/town.th.js (Thai).

import { th as TH } from '../data/town.th.js';

const UI = {
  en: {
    'nav.night': 'Night',
    'nav.blueprint': 'Blueprint',
    'nav.list': 'List view',
    'nav.match': 'Match a job',
    'nav.resume': 'Résumé',
    'nav.lang': 'ไทย',
    'nav.langLabel': 'เปลี่ยนเป็นภาษาไทย',
    'brand.small': 'Rinrada · Full-Stack Developer',
    'brand.label': 'MildRinrada Town. Open About me',
    'hint.desktop': 'Drag to orbit · Scroll to zoom · Click a building',
    'hint.touch': 'Drag to orbit · Pinch to zoom · Tap a building',
    'legend.night': 'Lit windows = running in production',
    'legend.hover': 'Hover a building to read its floors',
    'layer.frontend': 'Frontend',
    'layer.backend': 'Backend',
    'layer.infra': 'Infra & tools',
    'layer.data': 'Database',
    credit: '3D models by Kenney · CC0',
    'wx.city': 'Bangkok',
    'wx.live': 'LIVE',
    'wx.paused': 'PAUSED',
    'wx.liveTitle': 'The town follows the real time and weather in Bangkok (Open-Meteo).',
    'wx.pausedTitle': 'You changed the view yourself. Click to follow Bangkok again.',
    loading: 'Building the town…',
    'intro.eyebrow': 'MildRinrada Town',
    'intro.title': 'Welcome to my town',
    'intro.sub': 'Rinrada (Mild) · Full-Stack Developer',
    'intro.titleCompany': 'Hi, {company}',
    'intro.body1': 'Every building here is a system I designed and built. Click one to step inside, or switch on ',
    'intro.body2': ' to see the stack under every roof: frontend on top, database in the basement.',
    'intro.bodyCompany1': 'Welcome to MildRinrada Town. Every building here is a system I designed and built, and one lot is reserved for you. Click a building to step inside, or switch on ',
    'intro.bodyCompany2': ' to see the stack under every roof.',
    'intro.bodyRole': 'I have highlighted the buildings that matter most for a {role} role.',
    'intro.explore': 'Explore the town',
    'intro.list': 'Just show me the list',
    'eyebrow.experience': 'Experience',
    'eyebrow.education': 'Education',
    'eyebrow.about': 'About me',
    'section.highlights': 'Highlights',
    'section.whatIDo': 'What I do',
    'section.stack': 'Stack, floor by floor',
    'section.education': 'Education',
    'section.skills': 'Skills',
    'stack.blueprint': 'See these floors in Blueprint view →',
    'status.live': 'Live',
    'status.building': 'Under construction',
    'pin.work': 'Where I work · {period}',
    'pin.open': 'Open details',
    'lot.title': 'Vacant lot',
    'lot.sub': 'Next project · planning',
    'lot.reserved': 'Reserved for {company}',
    'lot.reservedSub': 'Next project',
    'lot.eyebrow': 'Coming soon',
    'lot.eyebrowReserved': 'Reserved lot',
    'lot.body': 'The plans are on the drawing board. The next building in town goes here.',
    'lot.bodyReserved': 'This lot is waiting for the next thing we build together. The rest of town shows how I work: contracts first, security from day one, and ownership from the frontend down to the database.',
    'btn.live': 'Visit live site ↗',
    'btn.code': 'View code',
    'btn.design': 'View design in Figma ↗',
    'btn.email': 'Email me',
    'btn.resume': 'Download résumé',
    'btn.printCv': 'Print CV',
    'img.cover': 'Cover',
    'img.shot': 'Screenshot {n}',
    'img.missing': 'Image not found: {src}',
    'img.video': 'Demo video',
    'img.pdf': 'Project deck (PDF)',
    'img.pdfMissing': 'PDF not found: {src}',
    'pdf.open': 'Open PDF ↗',
    'pdf.download': 'Download',
    'pdf.pages': '{n} pages',
    'img.videoMissing': 'Video not found: {src}',
    'img.playVideo': 'Play the demo video',
    'img.open': 'Open image full screen',
    'img.show': 'Show image {n}',
    'list.title': 'Everything in town',
    'list.back': 'Back to town',
    'list.experience': 'Experience & education',
    'list.projects': 'Projects · {n}',
    'list.show': 'Show in town →',
    'list.details': 'Details →',
    'list.more': 'More about me →',
    'list.no3d': "The 3D town couldn't start on this device, so here's the list version.",
    'list.noFile': 'This page was opened as a file, and browsers block the 3D models that way. Open it through a web server instead, for example VS Code Live Server, or once it is on GitHub Pages.',
    'list.noWebgl': 'This browser has WebGL (3D graphics) turned off, so here is the list version. Turning on hardware acceleration in the browser settings brings the town back.',
    'list.noNetwork': "The 3D engine couldn't be downloaded (no internet, or a blocker stopped cdn.jsdelivr.net), so here's the list version.",
    'list.bestFor': 'Best match for {role}',
    'role.frontend': 'Frontend',
    'role.backend': 'Backend',
    'role.fullstack': 'Full-Stack',
    'role.security': 'Security',
    'role.ai': 'AI / ML',
    'match.title': 'How well do I fit your role?',
    'match.desc': "Paste a job description and I'll light up the buildings that use the same skills. It runs in your browser; nothing is sent anywhere.",
    'match.placeholder': 'Paste the job description here…',
    'match.run': 'Match',
    'match.sample': 'Try a sample',
    'match.clear': 'Clear',
    'match.close': 'Close',
    'match.score': 'match',
    'match.summary': '{m} of {n} skills in this description are in my work',
    'match.have': 'Shown in my work',
    'match.gaps': 'Not in my portfolio yet',
    'match.gapsNote': 'Being upfront: these are skills I have not shown here yet.',
    'match.none': 'No skills recognised yet. Try pasting the requirements section.',
    'match.best': 'Best matches in town',
    'match.skills': '{n} skills',
    'match.listed': 'listed skill',
    'match.chip': '{p}% match',
    'match.roleChip': '{role} focus',
    'match.roleNote': 'Highlighting the work most relevant to a {role} role. Paste your own job description for a real score.',
    'cv.profile': 'Profile',
    'cv.experience': 'Experience',
    'cv.education': 'Education',
    'cv.skills': 'Skills',
    'cv.projects': 'Selected projects',
    'cv.interactive': 'Interactive version',
    'lb.close': 'Close image',
    'lb.prev': 'Previous image',
    'lb.next': 'Next image',
    'panel.close': 'Close details',
  },
  th: {
    'nav.night': 'กลางคืน',
    'nav.blueprint': 'พิมพ์เขียว',
    'nav.list': 'ดูแบบรายการ',
    'nav.match': 'เทียบกับงาน',
    'nav.resume': 'เรซูเม่',
    'nav.lang': 'EN',
    'nav.langLabel': 'Switch to English',
    'brand.small': 'Rinrada · Full-Stack Developer',
    'brand.label': 'MildRinrada Town เปิดหน้าเกี่ยวกับฉัน',
    'hint.desktop': 'ลากเพื่อหมุน · เลื่อนเพื่อซูม · คลิกที่ตึก',
    'hint.touch': 'ลากเพื่อหมุน · จีบนิ้วเพื่อซูม · แตะที่ตึก',
    'legend.night': 'หน้าต่างที่เปิดไฟ = ระบบที่ใช้งานจริง',
    'legend.hover': 'ชี้ที่ตึกเพื่อดูแต่ละชั้น',
    'layer.frontend': 'Frontend',
    'layer.backend': 'Backend',
    'layer.infra': 'Infra และเครื่องมือ',
    'layer.data': 'ฐานข้อมูล',
    credit: 'โมเดล 3D โดย Kenney · CC0',
    'wx.city': 'กรุงเทพฯ',
    'wx.live': 'สด',
    'wx.paused': 'หยุดตาม',
    'wx.liveTitle': 'เมืองนี้เปลี่ยนตามเวลาและสภาพอากาศจริงของกรุงเทพฯ (Open-Meteo)',
    'wx.pausedTitle': 'คุณเปลี่ยนมุมมองเอง กดเพื่อกลับไปตามกรุงเทพฯ อีกครั้ง',
    loading: 'กำลังสร้างเมือง…',
    'intro.eyebrow': 'MildRinrada Town',
    'intro.title': 'ยินดีต้อนรับสู่เมืองของฉัน',
    'intro.sub': 'Rinrada (Mild) · Full-Stack Developer',
    'intro.titleCompany': 'สวัสดี {company}',
    'intro.body1': 'ทุกตึกในเมืองนี้คือระบบที่ฉันออกแบบและสร้างเอง คลิกตึกเพื่อเข้าไปดูข้างใน หรือเปิดโหมด',
    'intro.body2': ' เพื่อดู stack ใต้หลังคาทุกหลัง: frontend อยู่ชั้นบน ฐานข้อมูลอยู่ใต้ดิน',
    'intro.bodyCompany1': 'ยินดีต้อนรับสู่ MildRinrada Town ทุกตึกในเมืองนี้คือระบบที่ฉันออกแบบและสร้างเอง และมีที่ดินหนึ่งแปลงจองไว้ให้คุณ คลิกตึกเพื่อเข้าไปดูข้างใน หรือเปิดโหมด',
    'intro.bodyCompany2': ' เพื่อดู stack ใต้หลังคาทุกหลัง',
    'intro.bodyRole': 'ฉันไฮไลต์ตึกที่เกี่ยวกับตำแหน่ง {role} มากที่สุดไว้ให้แล้ว',
    'intro.explore': 'เดินชมเมือง',
    'intro.list': 'ขอดูแบบรายการ',
    'eyebrow.experience': 'ประสบการณ์ทำงาน',
    'eyebrow.education': 'การศึกษา',
    'eyebrow.about': 'เกี่ยวกับฉัน',
    'section.highlights': 'จุดเด่น',
    'section.whatIDo': 'งานที่ทำ',
    'section.stack': 'Stack แยกตามชั้น',
    'section.education': 'การศึกษา',
    'section.skills': 'ทักษะ',
    'stack.blueprint': 'ดูชั้นเหล่านี้ในโหมดพิมพ์เขียว →',
    'status.live': 'ใช้งานจริง',
    'status.building': 'กำลังพัฒนา',
    'pin.work': 'ที่ทำงานปัจจุบัน · {period}',
    'pin.open': 'เปิดรายละเอียด',
    'lot.title': 'ที่ดินว่าง',
    'lot.sub': 'โปรเจกต์ถัดไป · กำลังวางแผน',
    'lot.reserved': 'จองไว้ให้ {company}',
    'lot.reservedSub': 'โปรเจกต์ถัดไป',
    'lot.eyebrow': 'เร็ว ๆ นี้',
    'lot.eyebrowReserved': 'ที่ดินที่จองไว้',
    'lot.body': 'แบบแปลนอยู่บนโต๊ะแล้ว ตึกหลังถัดไปของเมืองจะสร้างตรงนี้',
    'lot.bodyReserved': 'ที่ดินแปลงนี้รอสิ่งที่เราจะสร้างด้วยกัน ส่วนที่เหลือของเมืองบอกวิธีทำงานของฉัน: ออกแบบ contract ก่อน คิดเรื่องความปลอดภัยตั้งแต่วันแรก และดูแลตั้งแต่ frontend จนถึงฐานข้อมูล',
    'btn.live': 'เปิดเว็บจริง ↗',
    'btn.code': 'ดูโค้ด',
    'btn.design': 'ดูงานออกแบบใน Figma ↗',
    'btn.email': 'ส่งอีเมล',
    'btn.resume': 'ดาวน์โหลดเรซูเม่',
    'btn.printCv': 'พิมพ์ CV',
    'img.cover': 'ภาพปก',
    'img.shot': 'ภาพที่ {n}',
    'img.missing': 'ไม่พบภาพ: {src}',
    'img.video': 'วิดีโอสาธิต',
    'img.pdf': 'สไลด์นำเสนอ (PDF)',
    'img.pdfMissing': 'ไม่พบไฟล์ PDF: {src}',
    'pdf.open': 'เปิด PDF ↗',
    'pdf.download': 'ดาวน์โหลด',
    'pdf.pages': '{n} หน้า',
    'img.videoMissing': 'ไม่พบวิดีโอ: {src}',
    'img.playVideo': 'เล่นวิดีโอสาธิต',
    'img.open': 'เปิดภาพเต็มจอ',
    'img.show': 'แสดงภาพที่ {n}',
    'list.title': 'ทุกอย่างในเมือง',
    'list.back': 'กลับไปที่เมือง',
    'list.experience': 'ประสบการณ์และการศึกษา',
    'list.projects': 'ผลงาน · {n}',
    'list.show': 'ดูในเมือง →',
    'list.details': 'ดูรายละเอียด →',
    'list.more': 'อ่านเพิ่มเติม →',
    'list.no3d': 'อุปกรณ์นี้เปิดเมือง 3D ไม่ได้ เลยแสดงแบบรายการแทน',
    'list.noFile': 'หน้านี้ถูกเปิดเป็นไฟล์โดยตรง เบราว์เซอร์จึงบล็อกโมเดล 3D ให้เปิดผ่าน web server แทน เช่น VS Code Live Server หรือเปิดจาก GitHub Pages',
    'list.noWebgl': 'เบราว์เซอร์นี้ปิด WebGL (กราฟิก 3D) อยู่ เลยแสดงแบบรายการแทน เปิด hardware acceleration ในการตั้งค่าเบราว์เซอร์แล้วเมืองจะกลับมา',
    'list.noNetwork': 'โหลดตัว 3D engine ไม่ได้ (ไม่มีอินเทอร์เน็ต หรือมีตัวบล็อก cdn.jsdelivr.net) เลยแสดงแบบรายการแทน',
    'list.bestFor': 'ตรงกับตำแหน่ง {role} ที่สุด',
    'role.frontend': 'Frontend',
    'role.backend': 'Backend',
    'role.fullstack': 'Full-Stack',
    'role.security': 'Security',
    'role.ai': 'AI / ML',
    'match.title': 'ฉันเหมาะกับตำแหน่งของคุณแค่ไหน',
    'match.desc': 'วาง Job Description ลงไป แล้วตึกที่ใช้ skill เดียวกันจะสว่างขึ้น ระบบทำงานในเบราว์เซอร์ของคุณ ไม่มีข้อมูลถูกส่งออกไปที่ไหน',
    'match.placeholder': 'วาง Job Description ตรงนี้…',
    'match.run': 'เทียบเลย',
    'match.sample': 'ลองตัวอย่าง',
    'match.clear': 'ล้าง',
    'match.close': 'ปิด',
    'match.score': 'ตรงกัน',
    'match.summary': 'ตรง {m} จาก {n} skill ที่พบในประกาศนี้',
    'match.have': 'มีในผลงาน',
    'match.gaps': 'ยังไม่มีในผลงาน',
    'match.gapsNote': 'บอกกันตรง ๆ: skill เหล่านี้ฉันยังไม่ได้แสดงไว้ในผลงาน',
    'match.none': 'ยังไม่เจอ skill ที่รู้จัก ลองวางส่วนคุณสมบัติ (Requirements) ดูนะ',
    'match.best': 'ตึกที่ตรงที่สุด',
    'match.skills': '{n} skill',
    'match.listed': 'อยู่ในรายการทักษะ',
    'match.chip': 'ตรงกัน {p}%',
    'match.roleChip': 'เน้นตำแหน่ง {role}',
    'match.roleNote': 'กำลังไฮไลต์ผลงานที่เกี่ยวกับตำแหน่ง {role} มากที่สุด ถ้าอยากได้คะแนนจริง ลองวาง Job Description ของคุณดู',
    'cv.profile': 'โปรไฟล์',
    'cv.experience': 'ประสบการณ์ทำงาน',
    'cv.education': 'การศึกษา',
    'cv.skills': 'ทักษะ',
    'cv.projects': 'ผลงานที่คัดมา',
    'cv.interactive': 'เวอร์ชันโต้ตอบได้',
    'lb.close': 'ปิดภาพ',
    'lb.prev': 'ภาพก่อนหน้า',
    'lb.next': 'ภาพถัดไป',
    'panel.close': 'ปิดรายละเอียด',
  },
};

export const SAMPLE_JD = {
  en: `We're hiring a Full-Stack Developer to join our product team.

Requirements
- 2+ years with React or Next.js and TypeScript
- Backend experience with Node.js (NestJS) or Python (Django / FastAPI)
- Solid SQL with PostgreSQL or MySQL; Redis is a plus
- Building and documenting REST APIs (OpenAPI / Swagger)
- Docker, Git, and CI/CD with GitHub Actions
- Security awareness: OWASP, JWT / OAuth

Nice to have
- Kubernetes or AWS
- GraphQL
- LLM / AI integrations, LINE Messaging API`,
  th: `รับสมัคร Full-Stack Developer ร่วมทีมพัฒนาผลิตภัณฑ์

คุณสมบัติ
- มีประสบการณ์ React หรือ Next.js และ TypeScript อย่างน้อย 2 ปี
- พัฒนา backend ด้วย Node.js (NestJS) หรือ Python (Django / FastAPI)
- ใช้ SQL กับ PostgreSQL หรือ MySQL ได้ดี ถ้าใช้ Redis เป็นจะพิจารณาเป็นพิเศษ
- ออกแบบและเขียนเอกสาร REST API (OpenAPI / Swagger)
- ใช้ Docker, Git และ CI/CD ด้วย GitHub Actions
- เข้าใจเรื่องความปลอดภัย: OWASP, JWT / OAuth

จะพิจารณาเป็นพิเศษ
- Kubernetes หรือ AWS
- GraphQL
- เชื่อมต่อ LLM / AI, LINE Messaging API`,
};

let lang = 'en';
export const getLang = () => lang;
export function setLangValue(next) {
  lang = next === 'th' ? 'th' : 'en';
}

// t('key', { n: 3 }) → interface string in the current language
export function t(key, vars) {
  const s = UI[lang][key] ?? UI.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
}

// tp(place, 'summary') → the Thai version when there is one, otherwise the English from data/town.js
export function tp(p, field) {
  if (lang === 'th') {
    const v = TH.places[p.id]?.[field];
    if (v != null) return v;
  }
  return p[field];
}

// ts(site, 'headline') → the same for the About me text
export function ts(site, field) {
  if (lang === 'th' && TH.site[field] != null) return TH.site[field];
  return field in site.about ? site.about[field] : site[field];
}

export const skillLabel = (label) => (lang === 'th' && TH.site.skillLabels?.[label]) || label;
