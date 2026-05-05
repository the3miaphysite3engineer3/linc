import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { GiftKeys } from '../types';
import { Search, User, Calendar as CalendarIcon, Sparkles, ScrollText, Heart, Mail, LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';
import PageTitle from '../components/PageTitle';
import { useI18n } from '../i18n';

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
  const [assessments, setAssessments] = useState<FormRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FormRecord | null>(null);

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
  });

  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const lang = selected?.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English';
  const t = useI18n().t;
  const isAr = locale === 'ar';

  return (
    <div className="space-y-8" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        icon={<LayoutDashboard size={22} />}
      />

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
            const result = a.results[a.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English'];
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
                  <span className="font-bold text-[#8B1E1E]">{result.primaryGift || t('dashboard.noResult')}</span>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                  <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">{t('dashboard.primaryGift')}</p>
                  <p className="text-lg font-bold">{selected.results[lang].primaryGift || 'N/A'}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                  <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">{t('dashboard.secondaryGift')}</p>
                  <p className="text-lg font-bold">{selected.results[lang].secondaryGift || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-12 max-h-[800px] overflow-y-auto">
              <section>
                <h3 className="text-xl font-bold text-[#8B1E1E] border-b pb-2 mb-6">
                  {t('dashboard.faithJourney')}
                </h3>
                <div className="space-y-6">
                  {Object.entries(selected.fields.faith).map(([key, val]) => (
                    <div key={key} className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {lang === 'Arabic' ? val.questionArabic : val.questionEnglish}
                      </p>
                      <p className={`text-sm text-gray-700 leading-relaxed italic whitespace-pre-wrap ${isAr ? 'border-r-2 border-stone-200 pr-4' : 'border-l-2 border-stone-200 pl-4'}`}>
                        {val.answer || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#8B1E1E] border-b pb-2 mb-6 flex items-center gap-2">
                  <Sparkles size={20} />
                  {t('dashboard.giftScores')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {GiftKeys.map(key => (
                    <div key={key} className="p-4 bg-stone-50 rounded-2xl text-center border border-gray-100">
                      <div className="text-lg font-bold text-[#8B1E1E]">{selected.scores.gifts[key] || 0}</div>
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
                  {Object.entries(selected.fields.ministry).map(([key, val]) => (
                    <div key={key} className="p-4 bg-stone-50 rounded-2xl text-center border border-gray-100">
                      <div className="text-lg font-bold text-[#8B1E1E]">{val.score}</div>
                      <div className="text-[8px] uppercase tracking-widest font-black text-gray-400 mt-1">
                        {key} / 5
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#8B1E1E] border-b pb-2 mb-6 flex items-center gap-2">
                  <ScrollText size={20} />
                  {t('dashboard.vision')}
                </h3>
                <div className="space-y-6">
                  {Object.entries(selected.fields.vision).map(([key, val]) => (
                    <div key={key} className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {lang === 'Arabic' ? val.questionArabic : val.questionEnglish}
                      </p>
                      <p className={`text-sm text-gray-700 leading-relaxed italic whitespace-pre-wrap ${isAr ? 'border-r-2 border-stone-200 pr-4' : 'border-l-2 border-stone-200 pl-4'}`}>
                        {val.answer || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#8B1E1E] border-b pb-2 mb-6 flex items-center gap-2">
                  <Heart size={20} />
                  {t('dashboard.backgroundInfo')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                  {[
                    { label: t('dashboard.attendance'), id: 'attendance' },
                    { label: t('dashboard.currentService'), id: 'currentService' },
                    { label: t('dashboard.workContext'), id: 'workContext' },
                    { label: t('dashboard.arabicFluency'), id: 'arabicFluency' },
                    { label: t('dashboard.englishFluency'), id: 'englishFluency' },
                    { label: t('dashboard.otherLanguages'), id: 'otherLanguages' },
                  ].map(item => (
                    <div key={item.id}>
                      <h5 className={`font-bold text-gray-400 uppercase tracking-widest text-[10px] mb-2 ${isAr ? 'text-right' : 'text-left'}`}>{item.label}</h5>
                      <p className="text-gray-700">{getTraineeValue(selected.fields, item.id) || 'N/A'}</p>
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
    </div>
  );
}
