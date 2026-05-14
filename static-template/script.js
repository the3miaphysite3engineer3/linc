const copy = {
  en: {
    lang: 'ar',
    title: 'Discover Your Spiritual Gifts<br><span>LINC Assessment Experience</span>',
    description: 'A polished faith-centered landing template inspired by the LINC visual style.',
    program: 'LEADERSHIP DEVELOPMENT PROGRAM | 2026–2028',
    btnAssessment: 'Take the Assessment',
    btnAdmin: 'Admin Login',
    btnBook: 'Book a Meeting',
    btnNextGen: 'NextGen Activities',
    howTitle: 'How It Works',
    card1Title: 'Take the Assessment',
    card1Desc: 'Answer thoughtful questions about your journey, gifts, and ministry passions.',
    card2Title: 'Discover Your Gifts',
    card2Desc: 'Receive a personalized report with your primary and secondary gift profile.',
    card3Title: 'Find Your Calling',
    card3Desc: 'Align your strengths with ministry areas where you can serve effectively.',
    aboutTitle: 'About the Program',
    aboutDesc: 'This template keeps the same warm, elegant theme used in the LINC website: burgundy accents, soft neutral backgrounds, rounded cards, and bold call-to-action hierarchy.',
    readyTitle: 'Ready to Begin Your Journey?',
    readyDesc: 'Use this starter template and replace links/content with your live pages.',
    btnStart: 'Start Now',
    footerTagline: 'Developing spiritual leaders with clarity and purpose.',
    footerProgram: 'LINC MINISTRIES',
  },
  ar: {
    lang: 'en',
    title: 'اكتشف مواهبك الروحية<br><span>تجربة تقييم LINC</span>',
    description: 'قالب هبوط ثابت بطابع إيماني مستوحى من الهوية البصرية لموقع LINC.',
    program: 'برنامج تطوير القيادة | 2026–2028',
    btnAssessment: 'ابدأ التقييم',
    btnAdmin: 'تسجيل دخول الإدارة',
    btnBook: 'احجز اجتماعًا',
    btnNextGen: 'أنشطة الجيل القادم',
    howTitle: 'كيف يعمل',
    card1Title: 'ابدأ التقييم',
    card1Desc: 'أجب على أسئلة مدروسة حول رحلتك ومواهبك وشغفك بالخدمة.',
    card2Title: 'اكتشف مواهبك',
    card2Desc: 'احصل على تقرير شخصي يوضح الموهبة الأساسية والثانوية.',
    card3Title: 'اعثر على دعوتك',
    card3Desc: 'طابق نقاط قوتك مع مجالات الخدمة الأنسب لك.',
    aboutTitle: 'عن البرنامج',
    aboutDesc: 'يحافظ هذا القالب على نفس الطابع الدافئ والأنيق المستخدم في موقع LINC: درجات خمريّة، خلفيات هادئة، بطاقات مستديرة، وتسلسل واضح للأزرار الرئيسية.',
    readyTitle: 'هل أنت مستعد لبدء رحلتك؟',
    readyDesc: 'استخدم هذا القالب كنقطة بداية ثم استبدل الروابط والمحتوى بصفحاتك الفعلية.',
    btnStart: 'ابدأ الآن',
    footerTagline: 'تطوير قادة روحيين بوضوح ورسالة.',
    footerProgram: 'خدمة LINC',
  },
};

const fields = [
  'title', 'description', 'program',
  'howTitle', 'card1Title', 'card1Desc', 'card2Title', 'card2Desc', 'card3Title', 'card3Desc',
  'aboutTitle', 'aboutDesc', 'readyTitle', 'readyDesc', 'footerTagline', 'footerProgram',
];

let locale = 'en';
const langToggle = document.getElementById('langToggle');

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === 'title') {
    el.innerHTML = value;
  } else {
    el.textContent = value;
  }
}

function setBtn(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const arrow = el.querySelector('.arrow');
  el.textContent = value;
  if (arrow) {
    el.append(' ');
    el.append(arrow);
  }
}

function applyLocale() {
  const t = copy[locale];
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  langToggle.textContent = t.lang === 'ar' ? 'العربية' : 'English';

  fields.forEach((key) => setText(key, t[key]));
  setBtn('btnAssessment', t.btnAssessment);
  setBtn('btnStart', t.btnStart);
  setText('btnAdmin', t.btnAdmin);
  setText('btnBook', t.btnBook);
  setText('btnNextGen', t.btnNextGen);
}

langToggle?.addEventListener('click', () => {
  locale = locale === 'en' ? 'ar' : 'en';
  applyLocale();
});

document.querySelectorAll('a.btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
  });
});

window.addEventListener('scroll', () => {
  const offset = Math.min(window.scrollY * 0.1, 40);
  document.documentElement.style.setProperty('--glow-offset', `${offset}px`);
}, { passive: true });

applyLocale();
