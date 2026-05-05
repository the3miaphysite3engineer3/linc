import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { GiftKeys } from '../types';
import { Search, User, Calendar as CalendarIcon, Sparkles, Mail, LayoutDashboard, Settings, Send, Loader2, CheckCircle } from 'lucide-react';
import AdminManager from '../components/AdminManager';
import { format } from 'date-fns';
import PageTitle from '../components/PageTitle';
import { useI18n } from '../i18n';
import { sendEmailViaEmailJS } from '../services/gmail';

interface TraineeField {
  fieldEnglish: string;
  fieldArabic: string;
  value: string;
}

interface FaithAnswer {
  questionEnglish: string;
  questionArabic: string;
  answer: string;
}

interface VisionAnswer {
  questionEnglish: string;
  questionArabic: string;
  answer: string;
}

interface GiftQuestion {
  questionEnglish: string;
  questionArabic: string;
  score: number;
}

interface GiftSection {
  sectionEnglish: string;
  sectionArabic: string;
  questions: Record<string, GiftQuestion>;
}

interface MinistryItem {
  areaEnglish: string;
  areaArabic: string;
  score: number;
}

interface FormRecord {
  id?: string;
  createdAt: number;
  createdAtEasternTime: string;
  interfaceLanguageUsed: string;
  fields: {
    trainee: Record<string, TraineeField>;
    faith: Record<string, FaithAnswer>;
    gifts: Record<string, GiftSection>;
    ministry: Record<string, MinistryItem>;
    vision: Record<string, VisionAnswer>;
  };
  scores: {
    gifts: Record<string, number>;
    ministry: Record<string, number>;
  };
  results: {
    English: { primaryGift: string; secondaryGift: string; recommendedMinistry: string; summary: string };
    Arabic: { primaryGift: string; secondaryGift: string; recommendedMinistry: string; summary: string };
  };
}

function getTraineeValue(fields: FormRecord['fields'], id: string): string {
  return fields.trainee[id]?.value || '';
}

export default function AdminDashboard() {
  const { dir, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'assessments' | 'settings'>('assessments');
  const [assessments, setAssessments] = useState<FormRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FormRecord | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const formRef = ref(database, 'form/');
    const unsubscribe = onValue(formRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
        })) as FormRecord[];
        parsed.sort((a, b) => b.createdAt - a.createdAt);
        setAssessments(parsed);
      } else {
        setAssessments([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const filtered = assessments.filter(a => {
    const name = getTraineeValue(a.fields, 'fullName').toLowerCase();
    return name.includes(search.toLowerCase());
  }).filter(a => a.results);

  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const buildFullReport = (record: FormRecord) => {
    const rLang = record.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English';
    const results = record.results?.[rLang];
    const l = rLang === 'Arabic'
      ? { title: 'نتيجة تقييم المواهب الروحية والدعوة الشخصية', submittedAt: 'وقت الإرسال', interfaceLanguageUsed: 'لغة النموذج المستخدمة', traineeInfo: 'معلومات المتدرب', assessmentResults: 'نتائج التقييم', primaryGift: 'الموهبة الأساسية', secondaryGift: 'الموهبة الثانوية', recommendedMinistry: 'مجال الخدمة المقترح', summary: 'الملخص', faithJourney: 'الرحلة الإيمانية والمسيرة مع الله', personalGifts: 'تقييم المواهب الشخصية', totalScore: 'الدرجة الإجمالية', score: 'الدرجة', answer: 'الإجابة', ministryAlignment: 'التوافق والخبرة نحو الخدمة', callingVision: 'أسئلة الدعوة والرؤية', notAvailable: 'غير متوفر' }
      : { title: 'LINC SPIRITUAL GIFTS ASSESSMENT RESPONSE', submittedAt: 'Submitted At', interfaceLanguageUsed: 'Interface Language Used', traineeInfo: 'TRAINEE INFORMATION', assessmentResults: 'ASSESSMENT RESULTS', primaryGift: 'Primary Gift', secondaryGift: 'Secondary Gift', recommendedMinistry: 'Recommended Ministry', summary: 'Summary', faithJourney: 'FAITH JOURNEY AND WALK WITH GOD', personalGifts: 'PERSONAL GIFTS ASSESSMENT', totalScore: 'Total Score', score: 'Score', answer: 'Answer', ministryAlignment: 'MINISTRY ALIGNMENT AND EXPERIENCE', callingVision: 'CALLING AND VISION QUESTIONS', notAvailable: 'N/A' };
    const sep = '=========================================';
    const ssep = '-------------------------------';

    const traineeLines = Object.entries(record.fields.trainee).map(([_, f]) => {
      const field = f as TraineeField;
      return `${field.fieldEnglish}: ${field.value || l.notAvailable}`;
    });

    const faithLines = Object.entries(record.fields.faith).map(([_, q]) => {
      const qa = q as FaithAnswer;
      return `${qa.questionEnglish}\n${l.answer}: ${qa.answer || l.notAvailable}`;
    });

    const giftLines = Object.entries(record.fields.gifts).map(([key, gs]) => {
      const section = gs as GiftSection;
      const qLines = Object.entries(section.questions).map(([qKey, q]) =>
        `  ${qKey}. ${q.questionEnglish}\n  ${l.score}: ${q.score}/5`
      ).join('\n\n');
      return `${section.sectionEnglish}\n${l.totalScore}: ${record.scores?.gifts?.[key] || 0}/25\n${qLines}`;
    });

    const ministryLines = Object.entries(record.fields.ministry).map(([_, m]) => {
      const mi = m as MinistryItem;
      return `${mi.areaEnglish}: ${mi.score}/5`;
    });

    const visionLines = Object.entries(record.fields.vision).map(([_, q]) => {
      const va = q as VisionAnswer;
      return `${va.questionEnglish}\n${l.answer}: ${va.answer || l.notAvailable}`;
    });

    return [
      l.title, sep, '',
      `${l.submittedAt}: ${record.createdAtEasternTime}`,
      `${l.interfaceLanguageUsed}: ${record.interfaceLanguageUsed}`, '',
      l.traineeInfo, ssep, traineeLines.join('\n'), '',
      l.assessmentResults, ssep,
      `${l.primaryGift}: ${results?.primaryGift || l.notAvailable}`,
      `${l.secondaryGift}: ${results?.secondaryGift || l.notAvailable}`,
      `${l.recommendedMinistry}: ${results?.recommendedMinistry || l.notAvailable}`, '',
      `${l.summary}:`, results?.summary || '', '',
      l.faithJourney, ssep, faithLines.join('\n\n'), '',
      l.personalGifts, ssep, giftLines.join('\n\n'), '',
      l.ministryAlignment, ssep, ministryLines.join('\n'), '',
      l.callingVision, ssep, visionLines.join('\n\n'),
    ].join('\n');
  };

  const handleSendEmail = async () => {
    if (!selected) return;
    const email = getTraineeValue(selected.fields, 'email')?.trim();
    if (!email) return;
    setEmailSending(true);
    setEmailSent(false);
    try {
      const rLang = selected.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English';
      const results = selected.results?.[rLang];
      const fullReport = buildFullReport(selected);
      await sendEmailViaEmailJS(email, {
        fullName: getTraineeValue(selected.fields, 'fullName'),
        surveyDate: getTraineeValue(selected.fields, 'surveyDate'),
        age: getTraineeValue(selected.fields, 'age'),
        interfaceLanguageUsed: selected.interfaceLanguageUsed,
        submittedAt: selected.createdAtEasternTime,
        primaryGift: results?.primaryGift || '',
        secondaryGift: results?.secondaryGift || '',
        recommendedMinistry: results?.recommendedMinistry || '',
        fullReport,
      });
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      console.error('Email send failed:', err);
    } finally {
      setEmailSending(false);
    }
  };

  const t = useI18n().t;
  const isAr = locale === 'ar';

  return (
    <div className="space-y-8" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        icon={<LayoutDashboard size={22} />}
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('assessments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'assessments' ? 'bg-[#8B1E1E] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <LayoutDashboard size={16} /> {t('dashboard.tabAssessments') || 'Assessments'}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'settings' ? 'bg-[#8B1E1E] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Settings size={16} /> {t('dashboard.tabSettings') || 'Settings'}
        </button>
      </div>

      {activeTab === 'assessments' ? (
      <div className="flex flex-col lg:flex-row gap-8 min-h-[70vh]">
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div className="relative">
          <Search className={`absolute text-gray-400 ${isAr ? 'right-4 left-auto' : 'left-4'} top-1/2 -translate-y-1/2`} size={18} />
          <input
            type="text"
            placeholder={t('dashboard.search')}
            className={`w-full py-3 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none transition-all ${isAr ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
          {filtered.map(a => {
            const name = getTraineeValue(a.fields, 'fullName') || t('dashboard.anonymous');
            const result = a.results?.[a.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English'];
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className={`p-4 rounded-2xl border transition-all group ${isAr ? 'text-right' : 'text-left'} ${
                  selected?.id === a.id
                    ? 'bg-white border-[#8B1E1E] shadow-md ring-1 ring-[#8B1E1E]'
                    : 'bg-white border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold">{name}</h4>
                  <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                    {formatDate(a.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-widest">
                  <span className="font-bold text-[#8B1E1E]">{result?.primaryGift || t('dashboard.noResult')}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 italic">
              {t('dashboard.noResults')}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-[500px]">
        {selected ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 bg-[#8B1E1E] text-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {getTraineeValue(selected.fields, 'fullName') || t('dashboard.anonymous')}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                    <span className="flex items-center gap-1">
                      <CalendarIcon size={14} /> {t('dashboard.submitted')} {formatDate(selected.createdAt)}
                    </span>
                    {selected.interfaceLanguageUsed && (
                      <span className="flex items-center gap-1">
                        <Mail size={14} /> {selected.interfaceLanguageUsed}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 text-center">
                  <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">{t('dashboard.age')}</div>
                  <div className="text-xl font-bold">{getTraineeValue(selected.fields, 'age') || '??'}</div>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 text-center">
                  <button
                    onClick={handleSendEmail}
                    disabled={emailSending || !getTraineeValue(selected.fields, 'email')?.trim()}
                    className="flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                  >
                    {emailSent ? (
                      <>
                        <CheckCircle size={20} className="text-green-300" />
                        <div className="text-[10px] uppercase tracking-widest text-green-300 font-bold">Sent</div>
                      </>
                    ) : (
                      <>
                        {emailSending ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Send size={20} />
                        )}
                        <div className="text-[10px] uppercase tracking-widest opacity-80 font-bold">{emailSending ? 'Sending...' : 'Send Email'}</div>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-12 max-h-[800px] overflow-y-auto">
              <section>
                <h3 className="text-xl font-bold text-[#8B1E1E] border-b pb-2 mb-6 flex items-center gap-2">
                  <Sparkles size={20} />
                  {t('dashboard.giftScores')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {GiftKeys.map(key => (
                    <div key={key} className="p-4 bg-stone-50 rounded-2xl text-center border border-gray-100">
                      <div className="text-lg font-bold text-[#8B1E1E]">{selected.scores?.gifts?.[key] || 0}</div>
                      <div className="text-[8px] uppercase tracking-widest font-black text-gray-400 mt-1">
                        {t('dashboard.section')} {key} / 25
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#8B1E1E] border-b pb-2 mb-6 flex items-center gap-2">
                  <Sparkles size={20} />
                  {t('dashboard.ministryAlignment')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(selected.fields?.ministry || {}).map(([key, val]) => (
                    <div key={key} className="p-4 bg-stone-50 rounded-2xl text-center border border-gray-100">
                      <div className="text-lg font-bold text-[#8B1E1E]">{(val as any).score}</div>
                      <div className="text-[8px] uppercase tracking-widest font-black text-gray-400 mt-1">
                        {key} / 5
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className={`h-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 border-dashed`}>
            <User size={64} className="text-stone-200 mb-4" />
            <p className="text-gray-400 italic">{t('dashboard.selectTrainee')}</p>
          </div>
        )}
      </div>
    </div>
      ) : (
        <AdminManager onAdminsLoaded={() => {}} />
      )}
    </div>
  );
}
