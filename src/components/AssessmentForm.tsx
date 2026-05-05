import React, { useState } from 'react';
import { database } from '../firebase';
import { ref, push } from 'firebase/database';
import { GiftKeys } from '../types';
import { motion } from 'motion/react';
import { getStoredTokens, startGoogleAuth, sendGmailEmail } from '../services/gmail';
import PageTitle from './PageTitle';
import { ClipboardList } from 'lucide-react';

const GIFT_SECTIONS: Record<string, { en: string; ar: string; questions: { id: string; en: string; ar: string }[] }> = {
  A: {
    en: "Apostolic Gift / Pioneering Ministry",
    ar: "عَطيّة الرسولية / الخدمة الرائدة",
    questions: [
      { id: "A1", en: "I have vision and can see what a group or church could become in the future.", ar: "أمتلك رؤية ثاقبة، فأستطيع أن أرى ما يمكن أن تصبح عليه أي مجموعة أو كنيسة في المستقبل." },
      { id: "A2", en: "I feel driven to build new things, start new ministries, or pioneer new areas.", ar: "أشعر بدافع قوي لبناء أشياء جديدة، وتأسيس خدمات جديدة، أو الريادة في مجالات لم يسبقني إليها الآخرون." },
      { id: "A3", en: "I naturally take initiative in unstructured situations and help establish order and direction.", ar: "بأسلوب طبيعي أتولى زمام الأمور في المواقف غير المنظمة، وأساعد في إرساء النظام والتوجيه." },
      { id: "A4", en: "People see me as a leader even when I do not have an official title.", ar: "ينظر إليّ الناس كقائد حتى عندما لا يكون لديّ لقب أو منصب رسمي." },
      { id: "A5", en: "I care deeply about the health, growth, and management of the whole church, not only one area.", ar: "أشعر باهتمام بالغ إزاء صحة نمو وإدارة الكنيسة بأكملها، وليس في منطقة واحدة فقط." }
    ]
  },
  B: {
    en: "Prophetic Gift / Intercession Heart",
    ar: "عَطيّة النبوة / قلب الشفاعة",
    questions: [
      { id: "B1", en: "I am strongly drawn to long times of prayer; it feels natural rather than forced.", ar: "أجد نفسي منجذباً بشدة إلى أوقات الصلاة الطويلة، وأشعر أنها طبيعية وليست واجباً مفروضاً." },
      { id: "B2", en: "I often feel God speaks to me through Scripture, prayer, visions, dreams, or impressions.", ar: "أشعر في كثير من الأحيان أن الله يخاطبني من خلال الكتاب المقدس أو الصلاة أو الرؤى والأحلام أو الانطباعات." },
      { id: "B3", en: "I feel a strong burden to intercede for people, situations, or places.", ar: "أشعر بعبء قوي للتضرع من أجل الناس أو المواقف أو الأماكن." },
      { id: "B4", en: "I sometimes receive words of encouragement, visions, dreams, or guidance for others that prove accurate.", ar: "أتلقى أحياناً إعلانات أو كلمات تشجيع أو رؤى أو أحلام أو توجيهات للآخرين تثبت صحتها." },
      { id: "B5", en: "I am sensitive to spiritual atmospheres and notice when something feels spiritually wrong.", ar: "أنا حساس للأجواء الروحية وألاحظ عندما يكون هناك شيء غير طبيعي في الجو الروحي." }
    ]
  },
  C: {
    en: "Evangelistic Gift / Sharing Jesus with the Lost",
    ar: "عَطيّة التبشير / مشاركة يسوع مع الضالين",
    questions: [
      { id: "C1", en: "I feel urgency for people around me to know Jesus.", ar: "أشعر برغبة ملحة وثقل في أن يعرف الناس من حولي يسوع." },
      { id: "C2", en: "Speaking about my faith with unbelievers feels natural and joyful.", ar: "أجد أنه من الطبيعي والمفرح أن أتحدث عن إيماني مع أشخاص لا يعرفون المسيح." },
      { id: "C3", en: "My conversations with non-Christians naturally move toward spiritual topics.", ar: "أجد أن محادثاتي مع غير المسيحيين تتجه بشكل طبيعي نحو المواضيع الروحية." },
      { id: "C4", en: "When I hear the gospel presented, I feel strongly moved to invite people to respond.", ar: "عندما أسمع تقديم الإنجيل، أشعر برغبة قوية في دعوة الناس للاستجابة." },
      { id: "C5", en: "I feel concerned when the church does not reach out to the lost.", ar: "أشعر بالحزن والقلق عندما لا تبذل كنيستي جهداً للتواصل مع الضالين." }
    ]
  },
  D: {
    en: "Pastoral Gift / Shepherd Heart",
    ar: "عَطيّة الرعاية / قلب الراعي",
    questions: [
      { id: "D1", en: "I naturally notice when someone is hurting, isolated, or struggling.", ar: "ألاحظ بشكل طبيعي عندما يكون شخص ما متألماً أو منعزلاً أو يعاني من مشكلة." },
      { id: "D2", en: "People often come to me to share problems, ask advice, or be heard.", ar: "كثيراً ما يأتي إليّ الناس ليشاركوا مشاكلهم أو يطلبوا النصيحة أو يجدوا من يستمع إليهم." },
      { id: "D3", en: "I find deep fulfillment walking with someone over time as they grow and heal.", ar: "أجد شبعاً عميقاً في مرافقة شخص ما على مدى فترة طويلة أثناء نموه وتعافيه." },
      { id: "D4", en: "I feel protective responsibility toward people I care for.", ar: "أشعر بالتزام تقديم الحماية تجاه الأشخاص الذين أهتم لأمرهم." },
      { id: "D5", en: "I feel responsible toward the vulnerable, children, elderly, isolated, and broken.", ar: "أشعر بمسؤولية تجاه الضعفاء: الأطفال، وكبار السن، والمنعزلين، والمكسورين." }
    ]
  },
  E: {
    en: "Teaching Gift / Training and Methodology",
    ar: "عَطيّة التعليم / التدريب والمنهجية",
    questions: [
      { id: "E1", en: "I love studying Scripture deeply to understand meaning, context, and theology.", ar: "أحب دراسة الكتاب المقدس بعمق لفهم المعنى والسياق واللاهوت الكامن وراء النص." },
      { id: "E2", en: "When I learn something from Scripture, I immediately want to explain it to someone else.", ar: "عندما أتعلم شيئاً جديداً من الكتاب المقدس، أرغب فوراً في شرحه أو تعليمه لشخص آخر." },
      { id: "E3", en: "Biblical accuracy matters deeply to me, and I notice incorrect teaching.", ar: "الدقة الكتابية مهمة للغاية بالنسبة لي، وألاحظ التعليم غير الصحيح أو غير الدقيق." },
      { id: "E4", en: "I enjoy helping others understand complex truths clearly and simply.", ar: "أجد متعة كبيرة في مساعدة الآخرين على فهم الحقائق المعقدة بطريقة بسيطة وواضحة." },
      { id: "E5", en: "I naturally prepare, structure, and organize teaching content.", ar: "أميل بطبيعتي إلى إعداد محتوى التدريس وهيكلته وتنظيمه." }
    ]
  }
};

const MINISTRY_AREAS = [
  { id: "F1", en: "Prayer and Intercession", ar: "الصلاة والشفاعة" },
  { id: "F2", en: "Evangelism and Outreach", ar: "التبشير والتواصل" },
  { id: "F3", en: "Bible Teaching and Discipleship", ar: "تعليم الكتاب المقدس والتلمذة" },
  { id: "F4", en: "Spiritual Care and Follow-up", ar: "الرعاية الروحية والمتابعة" },
  { id: "F5", en: "Worship", ar: "العبادة" },
  { id: "F6", en: "Children's Ministry", ar: "خدمة الأطفال" },
  { id: "F7", en: "Youth Ministry", ar: "خدمة الشباب" },
  { id: "F8", en: "Media and Technology", ar: "الإعلام والتكنولوجيا" },
  { id: "F9", en: "Administration and Oversight", ar: "الإدارة والإشراف" },
  { id: "F10", en: "Hospitality and Welcome", ar: "الضيافة والترحيب" }
];

const TEXT_QUESTIONS = [
  { id: "q1_1", en: "Briefly describe how you came to faith in Jesus Christ.", ar: "صف بإيجاز كيف تعرفت على الإيمان بيسوع المسيح." },
  { id: "q1_2", en: "What does your daily devotional life look like now?", ar: "كيف تبدو حياتك التعبدية اليومية الآن؟" },
  { id: "q1_3", en: "What is your biggest challenge in your Christian life now?", ar: "ما هو أكبر تحدٍ أو صراع في حياتك المسيحية الآن؟" },
  { id: "q1_4", en: "Which biblical character do you feel closest to, and why?", ar: "أي شخصية في الكتاب المقدس تشعر بأنك الأقرب إليها، ولماذا؟" },
  { id: "q1_5", en: "How do people who know you well describe you?", ar: "كيف يصفك الأشخاص الذين يعرفونك جيدًا؟" }
];

const VISION_QUESTIONS = [
  { id: "v1", en: "If you could do one thing for the Kingdom of God without limits, what would it be?", ar: "إذا كان بإمكانك أن تفعل شيئًا واحدًا من أجل ملكوت الله دون قيود، فماذا سيكون؟" },
  { id: "v2", en: "What grieves you? What injustice, suffering, or spiritual need moves you deeply?", ar: "ما الذي يحزنك؟ ما هو الظلم أو المعاناة أو الحاجة الروحية التي تجعلك غاضباً أو تدفعك إلى البكاء؟" },
  { id: "v3", en: "When do you feel most spiritually alive?", ar: "متى تشعر بأنك أكثر حيوية روحياً؟" },
  { id: "v4", en: "Which ministry area are you most drawn to in this program, and why?", ar: "ما هو مجال الخدمة الذي تشعر بأنك منجذب إليه أكثر في هذا البرنامج، ولماذا؟" },
  { id: "v5", en: "What is your greatest fear about serving in ministry leadership?", ar: "ما هو أكبر مخاوفك بشأن العمل في قيادة الخدمة؟" },
  { id: "v6", en: "Is there anything in your life or past that may be an obstacle to your calling? (Optional)", ar: "هل هناك أي جانب من جوانب حياتك أو ماضيك تشعر أنه قد يشكل عائقاً أمام تحقيق رسالتك؟ (اختياري)" }
];

const GIFT_RECOMMENDATIONS: Record<string, { en: string; ar: string }> = {
  A: { en: "Apostolic / Pioneering Leadership", ar: "قيادة رسولية / خدمة رائدة" },
  B: { en: "Prophetic / Intercession Ministry", ar: "خدمة نبوية / شفاعة" },
  C: { en: "Evangelism and Outreach", ar: "التبشير والكرازة" },
  D: { en: "Pastoral Care and Shepherding", ar: "الرعاية الروحية وقلب الراعي" },
  E: { en: "Teaching, Training, and Discipleship", ar: "التعليم والتدريب والتلمذة" }
};

const TRAINEE_FIELDS = [
  { id: "fullName", en: "Full Name", ar: "الاسم الكامل", type: "text" as const, required: true },
  { id: "email", en: "Email Address", ar: "البريد الإلكتروني", type: "email" as const, required: true },
  { id: "surveyDate", en: "Survey Date", ar: "تاريخ الاستبيان", type: "date" as const, required: true },
  { id: "age", en: "Age", ar: "العمر", type: "number" as const, required: true },
  { id: "attendance", en: "How long have you attended LINC churches, and in which city?", ar: "منذ متى وأنت تحضر إلى كنائس LINC؟ وفي أي مدينة؟", type: "textarea" as const, required: true },
  { id: "currentService", en: "Current service at LINC churches, if any", ar: "خدمتك الحالية في كنائس LINC، إن وجدت", type: "textarea" as const, required: false },
  { id: "workContext", en: "Job / Work Context", ar: "وظيفتك / سياق عملك", type: "text" as const, required: false },
  { id: "arabicFluency", en: "Arabic Fluency", ar: "الطلاقة في العربية", type: "text" as const, required: false },
  { id: "englishFluency", en: "English Fluency", ar: "الطلاقة في الإنجليزية", type: "text" as const, required: false },
  { id: "otherLanguages", en: "Other Languages", ar: "لغات أخرى", type: "text" as const, required: false }
];

type Language = 'English' | 'Arabic';

interface GiftScores {
  A: number; B: number; C: number; D: number; E: number;
}

interface MinistryScores {
  F1: number; F2: number; F3: number; F4: number; F5: number;
  F6: number; F7: number; F8: number; F9: number; F10: number;
}

interface BilingualResult {
  English: { primaryGift: string; secondaryGift: string; recommendedMinistry: string; summary: string };
  Arabic: { primaryGift: string; secondaryGift: string; recommendedMinistry: string; summary: string };
}

export default function AssessmentForm() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('English');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trainee, setTrainee] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    TRAINEE_FIELDS.forEach(f => {
      if (f.type === 'number') init[f.id] = '18';
      else if (f.type === 'date') init[f.id] = new Date().toISOString().split('T')[0];
      else init[f.id] = '';
    });
    return init;
  });
  const [faithAnswers, setFaithAnswers] = useState<Record<string, string>>({});
  const [visionAnswers, setVisionAnswers] = useState<Record<string, string>>({});
  const [giftScores, setGiftScores] = useState<Record<string, number>>({});
  const [ministryScores, setMinistryScores] = useState<Record<string, number>>({});

  const t = (en: string, ar: string) => currentLanguage === 'English' ? en : ar;
  const isRtl = currentLanguage === 'Arabic';

  const getEasternTime = (): string => {
    return new Date().toLocaleString('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const calculateGiftScores = (): GiftScores => {
    const scores = {} as GiftScores;
    GiftKeys.forEach(sectionKey => {
      scores[sectionKey] = GIFT_SECTIONS[sectionKey].questions.reduce((sum, q) => sum + (giftScores[q.id] || 0), 0);
    });
    return scores;
  };

  const calculateMinistryScores = (): MinistryScores => {
    const scores = {} as MinistryScores;
    MINISTRY_AREAS.forEach(q => {
      scores[q.id as keyof MinistryScores] = ministryScores[q.id] || 0;
    });
    return scores;
  };

  const calculateResults = (): BilingualResult => {
    const giftTotals = calculateGiftScores();
    const ministryTotals = calculateMinistryScores();

    const sortedGifts = (Object.entries(giftTotals) as [GiftKey, number][])
      .sort((a, b) => b[1] - a[1]);
    const sortedMinistry = (Object.entries(ministryTotals) as [keyof MinistryScores, number][])
      .sort((a, b) => b[1] - a[1]);

    const primaryGiftKey = sortedGifts[0][0];
    const secondaryGiftKey = sortedGifts[1][0];
    const topMinistryKey = sortedMinistry[0][0];
    const topMinistryData = MINISTRY_AREAS.find(q => q.id === topMinistryKey)!;

    return {
      English: {
        primaryGift: GIFT_RECOMMENDATIONS[primaryGiftKey].en,
        secondaryGift: GIFT_RECOMMENDATIONS[secondaryGiftKey].en,
        recommendedMinistry: topMinistryData.en,
        summary: `The strongest result is ${GIFT_RECOMMENDATIONS[primaryGiftKey].en}. The secondary result is ${GIFT_RECOMMENDATIONS[secondaryGiftKey].en}. The most aligned ministry area is ${topMinistryData.en}.`
      },
      Arabic: {
        primaryGift: GIFT_RECOMMENDATIONS[primaryGiftKey].ar,
        secondaryGift: GIFT_RECOMMENDATIONS[secondaryGiftKey].ar,
        recommendedMinistry: topMinistryData.ar,
        summary: `أقوى نتيجة هي ${GIFT_RECOMMENDATIONS[primaryGiftKey].ar}. النتيجة الثانوية هي ${GIFT_RECOMMENDATIONS[secondaryGiftKey].ar}. مجال الخدمة الأكثر توافقاً هو ${topMinistryData.ar}.`
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const allGiftAnswered = GiftKeys.every(key =>
      GIFT_SECTIONS[key].questions.every(q => giftScores[q.id])
    );
    const allMinistryAnswered = MINISTRY_AREAS.every(q => ministryScores[q.id]);
    const allRequiredTrainee = TRAINEE_FIELDS.filter(f => f.required).every(f => trainee[f.id]?.trim());
    const allFaithAnswered = TEXT_QUESTIONS.every(q => faithAnswers[q.id]?.trim());
    const allVisionAnswered = VISION_QUESTIONS.slice(0, 5).every(q => visionAnswers[q.id]?.trim());

    if (!allRequiredTrainee || !allFaithAnswered || !allGiftAnswered || !allMinistryAnswered || !allVisionAnswered) {
      setError(t('Please complete all required fields.', 'يرجى إكمال جميع الحقول المطلوبة.'));
      return;
    }

    setLoading(true);
    try {
      const giftTotals = calculateGiftScores();
      const ministryTotals = calculateMinistryScores();
      const results = calculateResults();
      const submittedAt = getEasternTime();

      const fields = {
        trainee: Object.fromEntries(TRAINEE_FIELDS.map(f => [
          f.id,
          { fieldEnglish: f.en, fieldArabic: f.ar, value: trainee[f.id] || '' }
        ])),
        faith: Object.fromEntries(TEXT_QUESTIONS.map(q => [
          q.id,
          { questionEnglish: q.en, questionArabic: q.ar, answer: faithAnswers[q.id] || '' }
        ])),
        gifts: Object.fromEntries(GiftKeys.map(key => [
          key,
          {
            sectionEnglish: GIFT_SECTIONS[key].en,
            sectionArabic: GIFT_SECTIONS[key].ar,
            questions: Object.fromEntries(GIFT_SECTIONS[key].questions.map(q => [
              q.id,
              { questionEnglish: q.en, questionArabic: q.ar, score: giftScores[q.id] || 0 }
            ]))
          }
        ])),
        ministry: Object.fromEntries(MINISTRY_AREAS.map(q => [
          q.id,
          { areaEnglish: q.en, areaArabic: q.ar, score: ministryScores[q.id] || 0 }
        ])),
        vision: Object.fromEntries(VISION_QUESTIONS.map(q => [
          q.id,
          { questionEnglish: q.en, questionArabic: q.ar, answer: visionAnswers[q.id] || '' }
        ]))
      };

      const record = {
        tableNameEquivalent: 'form',
        createdAt: Date.now(),
        createdAtISO: new Date().toISOString(),
        createdAtEasternTime: submittedAt,
        interfaceLanguageUsed: currentLanguage,
        fields,
        scores: {
          gifts: giftTotals,
          ministry: ministryTotals
        },
        results
      };

      await push(ref(database, 'form/'), record);

      const tokens = getStoredTokens();
      if (tokens && trainee.email?.trim()) {
        const results = calculateResults();
        const langResults = results[currentLanguage === 'English' ? 'English' : 'Arabic'];
        const isEn = currentLanguage === 'English';

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f4f0; border-radius: 22px;">
            <div style="background: #8b1e1e; color: white; padding: 16px; border-radius: 14px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 20px;">LINC Spiritual Gifts Assessment</h1>
            </div>
            <p style="color: #333; font-size: 15px;">Dear ${trainee.fullName},</p>
            <p style="color: #555; font-size: 14px;">Thank you for completing the LINC Spiritual Gifts & Personal Calling Assessment. Here are your results:</p>
            <div style="background: white; padding: 16px; border-radius: 14px; border: 1px solid #e5e5e5; margin-bottom: 16px;">
              <p style="margin: 4px 0; font-size: 14px;"><strong>Primary Gift:</strong> ${langResults.primaryGift}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Secondary Gift:</strong> ${langResults.secondaryGift}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Recommended Ministry:</strong> ${langResults.recommendedMinistry}</p>
            </div>
            <p style="color: #555; font-size: 13px; font-style: italic; border-left: 3px solid #8b1e1e; padding-left: 12px;">${langResults.summary}</p>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">This assessment was submitted on ${submittedAt}.</p>
          </div>
        `;

        try {
          await sendGmailEmail(
            tokens,
            trainee.email.trim(),
            isEn ? 'Your LINC Spiritual Gifts Assessment Results' : 'نتائج تقييم المواهب الروحية - LINC',
            emailHtml.trim()
          );
        } catch (emailErr) {
          console.error('Email send failed:', emailErr);
        }
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError(t('Submission failed.', 'فشل إرسال التقييم.'));
    } finally {
      setLoading(false);
    }
  };

  const langResult = submitted ? calculateResults()[currentLanguage === 'English' ? 'English' : 'Arabic'] : null;
  const giftTotals = submitted ? calculateGiftScores() : null;
  const ministryTotals = submitted ? calculateMinistryScores() : null;

  if (submitted && langResult && giftTotals && ministryTotals) {
    return (
      <div className="max-w-[1120px] mx-auto px-[18px]" dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="flex justify-end py-[10px]">
          <button
            onClick={() => setCurrentLanguage(currentLanguage === 'English' ? 'Arabic' : 'English')}
            className="min-w-[112px] min-h-[44px] border-none bg-[#8b1e1e] text-white px-5 py-3 rounded-full font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px]"
          >
            {currentLanguage === 'English' ? 'العربية' : 'English'}
          </button>
        </div>

        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#8b1e1e] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="text-[clamp(1.22rem,4vw,1.55rem)] text-[#8b1e1e] mb-5" style={{ lineHeight: 1.35 }}>
            {t('Assessment Results', 'نتائج التقييم')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mb-[18px]">
            {[
              { label: t('Primary Gift', 'الموهبة الأساسية'), value: langResult.primaryGift },
              { label: t('Secondary Gift', 'الموهبة الثانوية'), value: langResult.secondaryGift },
              { label: t('Recommended Ministry Area', 'مجال الخدمة المقترح'), value: langResult.recommendedMinistry }
            ].map((item, i) => (
              <div key={i} className="bg-[#f8eeee] border border-[rgba(139,30,30,0.12)] rounded-[18px] p-4">
                <span className="block text-[#666] font-bold mb-1 text-sm">{item.label}</span>
                <strong className="text-[#641414] text-[1.05rem]">{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="bg-[#fffafa] border-l-4 border-[#8b1e1e] rounded-[14px] p-[14px_16px] font-bold italic mb-[18px]" style={{ [isRtl ? 'borderRight' : 'borderLeft']: '4px solid #8b1e1e', [isRtl ? 'borderLeft' : 'borderRight']: 'none' }}>
            {langResult.summary}
          </div>

          <h3 className="text-[1.05rem] text-[#641414] font-bold mb-[14px] mt-[26px]" style={{ lineHeight: 1.4 }}>
            {currentLanguage === 'English' ? 'Gift Scores' : 'نتائج المواهب'}
          </h3>
          <div className="grid gap-[10px] mb-[18px]">
            {GiftKeys.map(key => (
              <div key={key} className="flex justify-between items-center gap-[14px] bg-[#fafafa] border border-[#ddd] rounded-[14px] p-3">
                <span className="text-[#242424]">{t(GIFT_SECTIONS[key].en, GIFT_SECTIONS[key].ar)}</span>
                <strong className="text-[#641414] whitespace-nowrap">{giftTotals[key]} / 25</strong>
              </div>
            ))}
          </div>

          <h3 className="text-[1.05rem] text-[#641414] font-bold mb-[14px] mt-[26px]" style={{ lineHeight: 1.4 }}>
            {currentLanguage === 'English' ? 'Ministry Scores' : 'نتائج مجالات الخدمة'}
          </h3>
          <div className="grid gap-[10px] mb-[18px]">
            {MINISTRY_AREAS.map(q => (
              <div key={q.id} className="flex justify-between items-center gap-[14px] bg-[#fafafa] border border-[#ddd] rounded-[14px] p-3">
                <span className="text-[#242424]">{t(q.en, q.ar)}</span>
                <strong className="text-[#641414] whitespace-nowrap">{ministryTotals[q.id as keyof MinistryScores]} / 5</strong>
              </div>
            ))}
          </div>
        </motion.div>

        <button
          onClick={() => setSubmitted(false)}
          className="w-full min-h-[56px] mt-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem]"
        >
          {t('Take it again', 'أعد التقييم')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto px-[18px]" dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle
        title={t('LINC Spiritual Gifts & Personal Calling Assessment', 'تقييم المواهب الروحية والدعوة الشخصية')}
        subtitle={t('Leadership Development Program | 2026–2028', 'برنامج تطوير القيادة | 2026–2028')}
        icon={<ClipboardList size={22} />}
      />
      <div className="sticky top-0 z-[20] flex justify-end py-[10px] [backdrop-filter:blur(12px)]">
        <button
          onClick={() => setCurrentLanguage(currentLanguage === 'English' ? 'Arabic' : 'English')}
          className="min-w-[112px] min-h-[44px] border-none bg-[#8b1e1e] text-white px-5 py-3 rounded-full font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px]"
        >
          {currentLanguage === 'English' ? 'العربية' : 'English'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-[14px] font-bold">
            {error}
          </div>
        )}

        {/* Trainee Information */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold leading-[1.35] border-b-2 border-[#f8eeee] pb-[10px]" style={{ lineHeight: 1.35 }}>
            {t('Trainee Information', 'معلومات المتدرب')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRAINEE_FIELDS.map(field => (
              <div key={field.id} className="mb-[18px]">
                <label className="block font-bold mb-[7px] text-[#333]">
                  {t(field.en, field.ar)} {field.required && <span className="text-[#8b1e1e]">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    required={field.required}
                    className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                    style={{ minHeight: '112px', resize: 'vertical' }}
                    value={trainee[field.id] || ''}
                    onChange={e => setTrainee(p => ({ ...p, [field.id]: e.target.value }))}
                  />
                ) : (
                  <input
                    required={field.required}
                    type={field.type}
                    className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                    value={trainee[field.id] || ''}
                    onChange={e => setTrainee(p => ({ ...p, [field.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Faith Journey */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold leading-[1.35] border-b-2 border-[#f8eeee] pb-[10px]" style={{ lineHeight: 1.35 }}>
            {t('Part One — Faith Journey and Walk with God', 'الجزء الأول — الرحلة الإيمانية والمسيرة مع الله')}
          </h2>
          <div className="space-y-[22px]">
            {TEXT_QUESTIONS.map(q => (
              <div key={q.id} className="mb-[18px]">
                <label className="block font-bold mb-[7px] text-[#333]">{t(q.en, q.ar)}</label>
                <textarea
                  required
                  className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                  style={{ minHeight: '112px', resize: 'vertical' }}
                  value={faithAnswers[q.id] || ''}
                  onChange={e => setFaithAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Gifts Assessment */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold leading-[1.35] border-b-2 border-[#f8eeee] pb-[10px]" style={{ lineHeight: 1.35 }}>
            {t('Part Two — Personal Gifts Assessment', 'الجزء الثاني — تقييم المواهب الشخصية')}
          </h2>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">
            {t('Rate each statement from 1 to 5.', 'قيّم كل عبارة من 1 إلى 5.')}
          </div>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-6">
            {t('1 = Never, 2 = Rarely, 3 = Sometimes, 4 = Often, 5 = Always', '1 = أبداً، 2 = نادراً، 3 = أحياناً، 4 = غالباً، 5 = دائماً')}
          </div>

          {GiftKeys.map(sectionKey => (
            <div key={sectionKey} className="mt-[18px]">
              <h3 className="text-[#641414] mb-[14px] mt-[26px] text-[clamp(1.05rem,3.5vw,1.28rem)] font-bold leading-[1.4]" style={{ lineHeight: 1.4 }}>
                {t(GIFT_SECTIONS[sectionKey].en, GIFT_SECTIONS[sectionKey].ar)}
              </h3>
              {GIFT_SECTIONS[sectionKey].questions.map(q => (
                <div key={q.id} className="border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]">
                  <p className="font-bold m-0 mb-[14px] text-[#333]">{q.id}. {t(q.en, q.ar)}</p>
                  <div className="grid grid-cols-5 gap-[10px]">
                    {[1, 2, 3, 4, 5].map(num => (
                      <label
                        key={num}
                        className={`relative grid place-items-center min-h-[48px] border rounded-[14px] cursor-pointer bg-[#fafafa] transition-[transform,border-color,background,box-shadow] duration-150 select-none hover:-translate-y-[1px] hover:border-[rgba(139,30,30,0.45)] hover:shadow-[0_4px_12px_rgba(139,30,30,0.12)] ${
                          giftScores[q.id] === num
                            ? 'bg-[#8b1e1e] border-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.22)]'
                            : 'border-[#ddd]'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={num}
                          className="absolute opacity-0 pointer-events-none"
                          checked={giftScores[q.id] === num}
                          onChange={() => setGiftScores(p => ({ ...p, [q.id]: num }))}
                        />
                        <span className={`grid place-items-center w-full h-full font-bold ${giftScores[q.id] === num ? 'text-white' : 'text-[#444]'}`}>
                          {num}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* Ministry Alignment */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold leading-[1.35] border-b-2 border-[#f8eeee] pb-[10px]" style={{ lineHeight: 1.35 }}>
            {t('Part Three — Ministry Alignment and Experience', 'الجزء الثالث — التوافق والخبرة نحو الخدمة')}
          </h2>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-3">
            {t('Rate each statement from 1 to 5.', 'قيّم كل عبارة من 1 إلى 5.')}
          </div>
          <div className="bg-[#f8eeee] p-3 rounded-[14px] font-bold text-[#641414] mb-6">
            {t('1 = Never, 2 = Rarely, 3 = Sometimes, 4 = Often, 5 = Always', '1 = أبداً، 2 = نادراً، 3 = أحياناً، 4 = غالباً، 5 = دائماً')}
          </div>

          {MINISTRY_AREAS.map(q => (
            <div key={q.id} className="border border-[#ddd] p-4 rounded-[18px] mb-[14px] bg-[linear-gradient(180deg,#fff,#fffafa)]">
              <p className="font-bold m-0 mb-[14px] text-[#333]">{q.id}. {t(q.en, q.ar)}</p>
              <div className="grid grid-cols-5 gap-[10px]">
                {[1, 2, 3, 4, 5].map(num => (
                  <label
                    key={num}
                    className={`relative grid place-items-center min-h-[48px] border rounded-[14px] cursor-pointer bg-[#fafafa] transition-[transform,border-color,background,box-shadow] duration-150 select-none hover:-translate-y-[1px] hover:border-[rgba(139,30,30,0.45)] hover:shadow-[0_4px_12px_rgba(139,30,30,0.12)] ${
                      ministryScores[q.id] === num
                        ? 'bg-[#8b1e1e] border-[#8b1e1e] shadow-[0_8px_18px_rgba(139,30,30,0.22)]'
                        : 'border-[#ddd]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={num}
                      className="absolute opacity-0 pointer-events-none"
                      checked={ministryScores[q.id] === num}
                      onChange={() => setMinistryScores(p => ({ ...p, [q.id]: num }))}
                    />
                    <span className={`grid place-items-center w-full h-full font-bold ${ministryScores[q.id] === num ? 'text-white' : 'text-[#444]'}`}>
                      {num}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Vision Questions */}
        <section className="bg-[rgba(255,255,255,0.96)] border border-[rgba(139,30,30,0.1)] rounded-[22px] p-[clamp(18px,4vw,28px)] shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <h2 className="m-0 mb-5 text-[#8b1e1e] text-[clamp(1.22rem,4vw,1.55rem)] font-bold leading-[1.35] border-b-2 border-[#f8eeee] pb-[10px]" style={{ lineHeight: 1.35 }}>
            {t('Part Four — Calling and Vision Questions', 'الجزء الرابع — أسئلة الدعوة والرؤية')}
          </h2>
          <div className="space-y-[22px]">
            {VISION_QUESTIONS.map(q => (
              <div key={q.id} className="mb-[18px]">
                <label className="block font-bold mb-[7px] text-[#333]">
                  {t(q.en, q.ar)} {!q.id.startsWith('v6') && <span className="text-[#8b1e1e]">*</span>}
                </label>
                <textarea
                  required={!q.id.startsWith('v6')}
                  className="w-full px-[14px] py-[13px] border border-[#ddd] rounded-[14px] text-[1rem] bg-white text-[#242424] outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#8b1e1e] focus:shadow-[0_0_0_4px_rgba(139,30,30,0.12)]"
                  style={{ minHeight: '112px', resize: 'vertical' }}
                  value={visionAnswers[q.id] || ''}
                  onChange={e => setVisionAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[56px] mb-6 border-none bg-[#8b1e1e] text-white py-4 rounded-[18px] font-bold cursor-pointer shadow-[0_8px_18px_rgba(139,30,30,0.24)] transition-transform hover:-translate-y-[1px] text-[1.08rem] disabled:cursor-not-allowed disabled:opacity-72 disabled:translate-y-0"
        >
          {loading ? t('Submitting...', 'جارٍ الإرسال...') : t('Submit Assessment', 'إرسال التقييم')}
        </button>

        <p className="text-[10px] text-[#999] uppercase tracking-widest text-center mt-4">
          {t('All fields are confidential and for church leadership only.', 'جميع البيانات سرية ولأغراض الخدمة الكنسية فقط.')}
        </p>
      </form>
    </div>
  );
}
