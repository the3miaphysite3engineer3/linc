import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  HelpCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface BibleVerseEntry {
  id: string;
  reference: string;
  text: string;
}

interface QASessionForm {
  question: string;
  category: string;
  verses: BibleVerseEntry[];
  notes: string;
}

const CATEGORY_OPTIONS = [
  'Theology',
  'Apologetics',
  'Prayer',
  'Bible Study',
  'Discipleship',
  'Christian Living',
  'Church Life',
  'Youth Questions',
  'Other',
];

function createEmptyVerse(): BibleVerseEntry {
  return {
    id: crypto.randomUUID(),
    reference: '',
    text: '',
  };
}

export default function NextGenActivities() {
  const navigate = useNavigate();
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';
  const [isQASessionOpen, setIsQASessionOpen] = useState(false);
  const [form, setForm] = useState<QASessionForm>({
    question: '',
    category: 'Theology',
    verses: [createEmptyVerse()],
    notes: '',
  });

  const updateVerse = (id: string, field: keyof Omit<BibleVerseEntry, 'id'>, value: string) => {
    setForm(prev => ({
      ...prev,
      verses: prev.verses.map(verse =>
        verse.id === id
          ? {
              ...verse,
              [field]: value,
            }
          : verse
      ),
    }));
  };

  const addVerse = () => {
    setForm(prev => ({
      ...prev,
      verses: [...prev.verses, createEmptyVerse()],
    }));
  };

  const removeVerse = (id: string) => {
    setForm(prev => ({
      ...prev,
      verses: prev.verses.length === 1
        ? [createEmptyVerse()]
        : prev.verses.filter(verse => verse.id !== id),
    }));
  };

  const resetForm = () => {
    setForm({
      question: '',
      category: 'Theology',
      verses: [createEmptyVerse()],
      notes: '',
    });
  };

  const handleSaveDraft = () => {
    const payload = {
      ...form,
      updatedAt: Date.now(),
    };

    console.log('NextGen Q&A draft:', payload);
    alert(isArabic ? 'تم تجهيز مسودة جلسة الأسئلة.' : 'Q&A session draft prepared.');
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <section className="relative overflow-hidden px-6 py-10">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle at 50% 0%, #8b1e1e, transparent 58%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-[#8b1e1e] rounded-full font-bold border border-[rgba(139,30,30,0.12)] shadow-sm hover:bg-[#f8eeee] transition-all"
          >
            <ArrowLeft size={18} className={isArabic ? 'rotate-180' : ''} />
            {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
          </button>

          <div className="text-center mt-14 mb-12">
            <div className="w-16 h-16 mx-auto grid place-items-center rounded-full bg-[#8b1e1e] text-white shadow-[0_8px_28px_rgba(139,30,30,0.24)] mb-6">
              <Sparkles size={28} />
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold text-[#8b1e1e] leading-tight mb-4">
              {isArabic ? 'أنشطة NextGen' : 'NextGen Activities'}
            </h1>
            <p className="max-w-2xl mx-auto text-[#666] text-lg leading-relaxed">
              {isArabic
                ? 'مساحة لإضافة أنشطة وأسئلة ومحتوى تعليمي خاص بخدمة NextGen.'
                : 'A dedicated space for NextGen activities, questions, discussion topics, and teaching content.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <motion.button
              type="button"
              onClick={() => setIsQASessionOpen(true)}
              whileTap={{ scale: 0.98 }}
              className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${
                isQASessionOpen
                  ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]'
                  : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${isQASessionOpen ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}>
                    <HelpCircle size={26} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {isArabic ? 'جلسة أسئلة وأجوبة' : 'Q&A Session'}
                    </h2>
                    <p className={`text-sm mt-1 ${isQASessionOpen ? 'text-white/80' : 'text-[#777]'}`}>
                      {isArabic ? 'أضف سؤالاً وآيات وتصنيفاً.' : 'Add a question, related verses, and a category.'}
                    </p>
                  </div>
                </div>
                <ChevronDown size={22} className={`transition-transform ${isQASessionOpen ? 'rotate-180' : ''}`} />
              </div>
            </motion.button>

            <div className="p-7 rounded-[28px] bg-white border border-[rgba(139,30,30,0.08)] shadow-sm">
              <h3 className="text-xl font-bold text-[#8b1e1e] mb-3">
                {isArabic ? 'ملاحظات التنفيذ' : 'Implementation Notes'}
              </h3>
              <p className="text-[#666] leading-relaxed">
                {isArabic
                  ? 'هذه الصفحة جاهزة كبداية. يمكن لاحقاً ربط الحفظ بقاعدة البيانات أو إضافة مساعد ذكاء اصطناعي لمعالجة الأسئلة وتصنيفها.'
                  : 'This page is ready as the starting point. Later, saving can be connected to Firebase or an AI assistant can be added to process and categorize questions.'}
              </p>
            </div>
          </div>

          {isQASessionOpen && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
                <div className="flex items-center gap-3">
                  <BookOpen size={24} />
                  <div>
                    <h2 className="text-2xl font-bold">
                      {isArabic ? 'إعداد جلسة أسئلة وأجوبة' : 'Create Q&A Session'}
                    </h2>
                    <p className="text-white/75 text-sm mt-1">
                      {isArabic ? 'اكتب السؤال، أضف الآيات، ثم اختر التصنيف.' : 'Write the question, add related verses, then select the category.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQASessionOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-7">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {isArabic ? 'السؤال' : 'Question'}
                  </label>
                  <textarea
                    value={form.question}
                    onChange={e => setForm(prev => ({ ...prev, question: e.target.value }))}
                    rows={4}
                    placeholder={isArabic ? 'اكتب السؤال هنا...' : 'Write the question here...'}
                    className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none resize-none text-[#242424]"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {isArabic ? 'آيات مرتبطة' : 'Related Bible Verses'}
                      </label>
                      <p className="text-xs text-gray-400 mt-1">
                        {isArabic ? 'أضف مرجع الآية والنص المرتبط بالسؤال.' : 'Add the verse reference and related verse text.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addVerse}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#f8eeee] text-[#8b1e1e] rounded-xl font-bold text-sm hover:bg-[#8b1e1e] hover:text-white transition-colors"
                    >
                      <Plus size={16} />
                      {isArabic ? 'إضافة آية' : 'Add Verse'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {form.verses.map((verse, index) => (
                      <div key={verse.id} className="p-4 rounded-2xl bg-stone-50 border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-[#641414]">
                            {isArabic ? `آية ${index + 1}` : `Verse ${index + 1}`}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeVerse(verse.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={verse.reference}
                            onChange={e => updateVerse(verse.id, 'reference', e.target.value)}
                            placeholder={isArabic ? 'مثال: يوحنا 3:16' : 'Example: John 3:16'}
                            className="px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none md:col-span-1"
                          />
                          <textarea
                            value={verse.text}
                            onChange={e => updateVerse(verse.id, 'text', e.target.value)}
                            rows={2}
                            placeholder={isArabic ? 'نص الآية أو الملاحظة...' : 'Verse text or note...'}
                            className="px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none resize-none md:col-span-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {isArabic ? 'التصنيف' : 'Category'}
                    </label>
                    <select
                      value={form.category}
                      onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none font-bold text-[#641414]"
                    >
                      {CATEGORY_OPTIONS.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {isArabic ? 'ملاحظات داخلية' : 'Internal Notes'}
                    </label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={isArabic ? 'ملاحظات اختيارية...' : 'Optional notes...'}
                      className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-stone-100 text-[#641414] rounded-xl font-bold hover:bg-stone-200 transition-colors"
                  >
                    {isArabic ? 'إعادة ضبط' : 'Reset'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#8b1e1e] text-white rounded-xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] active:bg-[#3f0f0f] transition-colors"
                  >
                    <Save size={18} />
                    {isArabic ? 'حفظ المسودة' : 'Save Draft'}
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </div>
      </section>
    </div>
  );
}
