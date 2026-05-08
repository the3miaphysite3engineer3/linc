import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  HelpCircle,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { ref, push } from 'firebase/database';
import { database } from '../firebase';
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

interface BibleBook {
  id: string;
  name: string;
  chapters: number;
}

interface ChapterVerse {
  verse: number;
  text: string;
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

const BIBLE_BOOKS: BibleBook[] = [
  { id: 'Genesis', name: 'Genesis', chapters: 50 },
  { id: 'Exodus', name: 'Exodus', chapters: 40 },
  { id: 'Leviticus', name: 'Leviticus', chapters: 27 },
  { id: 'Numbers', name: 'Numbers', chapters: 36 },
  { id: 'Deuteronomy', name: 'Deuteronomy', chapters: 34 },
  { id: 'Joshua', name: 'Joshua', chapters: 24 },
  { id: 'Judges', name: 'Judges', chapters: 21 },
  { id: 'Ruth', name: 'Ruth', chapters: 4 },
  { id: '1 Samuel', name: '1 Samuel', chapters: 31 },
  { id: '2 Samuel', name: '2 Samuel', chapters: 24 },
  { id: '1 Kings', name: '1 Kings', chapters: 22 },
  { id: '2 Kings', name: '2 Kings', chapters: 25 },
  { id: '1 Chronicles', name: '1 Chronicles', chapters: 29 },
  { id: '2 Chronicles', name: '2 Chronicles', chapters: 36 },
  { id: 'Ezra', name: 'Ezra', chapters: 10 },
  { id: 'Nehemiah', name: 'Nehemiah', chapters: 13 },
  { id: 'Esther', name: 'Esther', chapters: 10 },
  { id: 'Job', name: 'Job', chapters: 42 },
  { id: 'Psalms', name: 'Psalms', chapters: 150 },
  { id: 'Proverbs', name: 'Proverbs', chapters: 31 },
  { id: 'Ecclesiastes', name: 'Ecclesiastes', chapters: 12 },
  { id: 'Song of Solomon', name: 'Song of Solomon', chapters: 8 },
  { id: 'Isaiah', name: 'Isaiah', chapters: 66 },
  { id: 'Jeremiah', name: 'Jeremiah', chapters: 52 },
  { id: 'Lamentations', name: 'Lamentations', chapters: 5 },
  { id: 'Ezekiel', name: 'Ezekiel', chapters: 48 },
  { id: 'Daniel', name: 'Daniel', chapters: 12 },
  { id: 'Hosea', name: 'Hosea', chapters: 14 },
  { id: 'Joel', name: 'Joel', chapters: 3 },
  { id: 'Amos', name: 'Amos', chapters: 9 },
  { id: 'Obadiah', name: 'Obadiah', chapters: 1 },
  { id: 'Jonah', name: 'Jonah', chapters: 4 },
  { id: 'Micah', name: 'Micah', chapters: 7 },
  { id: 'Nahum', name: 'Nahum', chapters: 3 },
  { id: 'Habakkuk', name: 'Habakkuk', chapters: 3 },
  { id: 'Zephaniah', name: 'Zephaniah', chapters: 3 },
  { id: 'Haggai', name: 'Haggai', chapters: 2 },
  { id: 'Zechariah', name: 'Zechariah', chapters: 14 },
  { id: 'Malachi', name: 'Malachi', chapters: 4 },
  { id: 'Matthew', name: 'Matthew', chapters: 28 },
  { id: 'Mark', name: 'Mark', chapters: 16 },
  { id: 'Luke', name: 'Luke', chapters: 24 },
  { id: 'John', name: 'John', chapters: 21 },
  { id: 'Acts', name: 'Acts', chapters: 28 },
  { id: 'Romans', name: 'Romans', chapters: 16 },
  { id: '1 Corinthians', name: '1 Corinthians', chapters: 16 },
  { id: '2 Corinthians', name: '2 Corinthians', chapters: 13 },
  { id: 'Galatians', name: 'Galatians', chapters: 6 },
  { id: 'Ephesians', name: 'Ephesians', chapters: 6 },
  { id: 'Philippians', name: 'Philippians', chapters: 4 },
  { id: 'Colossians', name: 'Colossians', chapters: 4 },
  { id: '1 Thessalonians', name: '1 Thessalonians', chapters: 5 },
  { id: '2 Thessalonians', name: '2 Thessalonians', chapters: 3 },
  { id: '1 Timothy', name: '1 Timothy', chapters: 6 },
  { id: '2 Timothy', name: '2 Timothy', chapters: 4 },
  { id: 'Titus', name: 'Titus', chapters: 3 },
  { id: 'Philemon', name: 'Philemon', chapters: 1 },
  { id: 'Hebrews', name: 'Hebrews', chapters: 13 },
  { id: 'James', name: 'James', chapters: 5 },
  { id: '1 Peter', name: '1 Peter', chapters: 5 },
  { id: '2 Peter', name: '2 Peter', chapters: 3 },
  { id: '1 John', name: '1 John', chapters: 5 },
  { id: '2 John', name: '2 John', chapters: 1 },
  { id: '3 John', name: '3 John', chapters: 1 },
  { id: 'Jude', name: 'Jude', chapters: 1 },
  { id: 'Revelation', name: 'Revelation', chapters: 22 },
];

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyVerse(): BibleVerseEntry {
  return {
    id: createId(),
    reference: '',
    text: '',
  };
}

function cleanVerseText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
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

  const [bookSearch, setBookSearch] = useState('John');
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS.find(book => book.name === 'John') || BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState(3);
  const [chapterVerses, setChapterVerses] = useState<ChapterVerse[]>([]);
  const [selectedStartVerse, setSelectedStartVerse] = useState(16);
  const [selectedEndVerse, setSelectedEndVerse] = useState(16);
  const [isFetchingVerses, setIsFetchingVerses] = useState(false);
  const [verseFetchError, setVerseFetchError] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const filteredBooks = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();

    if (!query) return BIBLE_BOOKS;

    return BIBLE_BOOKS.filter(book => book.name.toLowerCase().includes(query));
  }, [bookSearch]);

  const chapterOptions = useMemo(() => {
    return Array.from({ length: selectedBook.chapters }, (_, index) => index + 1);
  }, [selectedBook]);

  const verseOptions = useMemo(() => {
    return chapterVerses.map(verse => verse.verse);
  }, [chapterVerses]);

  const selectedReference = useMemo(() => {
    if (!selectedBook || !selectedChapter || !selectedStartVerse) return '';

    const versePart = selectedEndVerse > selectedStartVerse
      ? `${selectedStartVerse}-${selectedEndVerse}`
      : `${selectedStartVerse}`;

    return `${selectedBook.name} ${selectedChapter}:${versePart} (WEB)`;
  }, [selectedBook, selectedChapter, selectedStartVerse, selectedEndVerse]);

  useEffect(() => {
    let isMounted = true;

    const fetchChapterVerses = async () => {
      setIsFetchingVerses(true);
      setVerseFetchError('');
      setChapterVerses([]);

      try {
        const reference = encodeURIComponent(`${selectedBook.name} ${selectedChapter}`);
        const response = await fetch(`https://bible-api.com/${reference}?translation=web`);

        if (!response.ok) {
          throw new Error(`Bible lookup failed with status ${response.status}`);
        }

        const data = await response.json();
        const verses: ChapterVerse[] = Array.isArray(data.verses)
          ? data.verses
              .map((verse: any) => ({
                verse: Number(verse.verse),
                text: cleanVerseText(String(verse.text || '')),
              }))
              .filter((verse: ChapterVerse) => Number.isFinite(verse.verse) && verse.text)
          : [];

        if (!verses.length) {
          throw new Error('No verses returned for this chapter.');
        }

        if (!isMounted) return;

        setChapterVerses(verses);
        setSelectedStartVerse(verses[0].verse);
        setSelectedEndVerse(verses[0].verse);
      } catch (err) {
        console.error('WEB Bible lookup failed:', err);

        if (!isMounted) return;

        setVerseFetchError(
          isArabic
            ? 'تعذر تحميل آيات WEB حالياً. تحقق من الاتصال بالإنترنت ثم حاول مرة أخرى.'
            : 'Could not load WEB verses right now. Check the internet connection and try again.'
        );
      } finally {
        if (isMounted) {
          setIsFetchingVerses(false);
        }
      }
    };

    fetchChapterVerses();

    return () => {
      isMounted = false;
    };
  }, [selectedBook, selectedChapter, isArabic]);

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

  const selectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setBookSearch(book.name);
    setSelectedChapter(1);
    setSelectedStartVerse(1);
    setSelectedEndVerse(1);
  };

  const addSelectedWebVerse = () => {
    if (!chapterVerses.length || !selectedReference) return;

    const start = Math.min(selectedStartVerse, selectedEndVerse);
    const end = Math.max(selectedStartVerse, selectedEndVerse);
    const selectedText = chapterVerses
      .filter(verse => verse.verse >= start && verse.verse <= end)
      .map(verse => `${verse.verse}. ${verse.text}`)
      .join('\n');

    const newVerse: BibleVerseEntry = {
      id: createId(),
      reference: selectedReference,
      text: selectedText,
    };

    setForm(prev => {
      const hasOnlyEmptyVerse = prev.verses.length === 1 && !prev.verses[0].reference.trim() && !prev.verses[0].text.trim();

      return {
        ...prev,
        verses: hasOnlyEmptyVerse ? [newVerse] : [...prev.verses, newVerse],
      };
    });
  };

  const handleSaveDraft = async () => {
    const cleanedQuestion = form.question.trim();
    const cleanedNotes = form.notes.trim();
    const cleanedVerses = form.verses
      .map(verse => ({
        reference: verse.reference.trim(),
        text: verse.text.trim(),
      }))
      .filter(verse => verse.reference || verse.text);

    if (!cleanedQuestion) {
      alert(isArabic ? 'يرجى كتابة السؤال قبل الحفظ.' : 'Please write the question before saving.');
      return;
    }

    if (cleanedVerses.length === 0) {
      alert(isArabic ? 'يرجى إضافة آية واحدة على الأقل قبل الحفظ.' : 'Please add at least one related verse before saving.');
      return;
    }

    setIsSavingDraft(true);

    try {
      const now = Date.now();
      const payload = {
        question: cleanedQuestion,
        category: form.category,
        verses: cleanedVerses,
        notes: cleanedNotes,
        status: 'submittedForPastorReview',
        source: 'nextGenActivities',
        translation: 'WEB',
        createdAt: now,
        updatedAt: now,
      };

      await push(ref(database, 'nextGenActivities/qaSessions/'), payload);

      alert(isArabic ? 'تم حفظ السؤال ليتمكن Pastor من مراجعته.' : 'Q&A session saved for Pastor review.');
      resetForm();
      setIsQASessionOpen(false);
    } catch (err) {
      console.error('Failed to save NextGen Q&A session:', err);
      alert(isArabic ? 'فشل حفظ السؤال في قاعدة البيانات.' : 'Failed to save the Q&A session to the database.');
    } finally {
      setIsSavingDraft(false);
    }
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
                  ? 'هذه الصفحة تستخدم ترجمة WEB العامة للوصول إلى الآيات بدون مفتاح API وبدون إعلانات.'
                  : 'This page uses the public-domain WEB translation for Bible verse lookup without an API key and without ads.'}
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
                      {isArabic ? 'اكتب السؤال، اختر آيات WEB، ثم اختر التصنيف.' : 'Write the question, select WEB verses, then choose the category.'}
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
                        {isArabic ? 'محدد آيات WEB' : 'WEB Bible Verse Selector'}
                      </label>
                      <p className="text-xs text-gray-400 mt-1">
                        {isArabic
                          ? 'ابحث عن السفر، اختر الإصحاح، اختر الآية أو المدى، ثم أضفها كمرجع ونص.'
                          : 'Search the book, select chapter, select verse or range, then add it as reference and text.'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-xs font-bold">
                      WEB · Public Domain
                    </span>
                  </div>

                  <div className="p-5 rounded-3xl bg-stone-50 border border-gray-100 space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {isArabic ? 'السفر' : 'Book'}
                        </label>
                        <div className="relative">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={bookSearch}
                            onChange={e => setBookSearch(e.target.value)}
                            placeholder={isArabic ? 'اكتب اسم السفر...' : 'Type a few letters, e.g. John'}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none font-bold text-[#641414]"
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto bg-white rounded-xl border border-gray-100 p-2 space-y-1">
                          {filteredBooks.map(book => (
                            <button
                              key={book.id}
                              type="button"
                              onClick={() => selectBook(book)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                                selectedBook.id === book.id
                                  ? 'bg-[#8b1e1e] text-white'
                                  : 'text-[#641414] hover:bg-[#f8eeee]'
                              }`}
                            >
                              {book.name}
                            </button>
                          ))}
                          {filteredBooks.length === 0 && (
                            <div className="px-3 py-3 text-sm text-gray-400 italic">
                              {isArabic ? 'لا توجد أسفار مطابقة.' : 'No matching books.'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {isArabic ? 'الإصحاح' : 'Chapter'}
                        </label>
                        <select
                          value={selectedChapter}
                          onChange={e => setSelectedChapter(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none font-bold text-[#641414]"
                        >
                          {chapterOptions.map(chapter => (
                            <option key={chapter} value={chapter}>{chapter}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {isArabic ? 'الآية' : 'Verse Range'}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={selectedStartVerse}
                            onChange={e => {
                              const value = Number(e.target.value);
                              setSelectedStartVerse(value);
                              if (selectedEndVerse < value) setSelectedEndVerse(value);
                            }}
                            disabled={isFetchingVerses || verseOptions.length === 0}
                            className="w-full px-3 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none font-bold text-[#641414] disabled:opacity-60"
                          >
                            {verseOptions.map(verse => (
                              <option key={verse} value={verse}>{verse}</option>
                            ))}
                          </select>
                          <select
                            value={selectedEndVerse}
                            onChange={e => setSelectedEndVerse(Number(e.target.value))}
                            disabled={isFetchingVerses || verseOptions.length === 0}
                            className="w-full px-3 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none font-bold text-[#641414] disabled:opacity-60"
                          >
                            {verseOptions
                              .filter(verse => verse >= selectedStartVerse)
                              .map(verse => (
                                <option key={verse} value={verse}>{verse}</option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-100 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {isArabic ? 'المعاينة' : 'Preview'}
                          </div>
                          <h4 className="text-lg font-bold text-[#8b1e1e] mt-1">{selectedReference}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={addSelectedWebVerse}
                          disabled={isFetchingVerses || Boolean(verseFetchError) || chapterVerses.length === 0}
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#8b1e1e] text-white rounded-xl font-bold hover:bg-[#641414] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          {isFetchingVerses ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                          {isArabic ? 'إضافة الآية' : 'Add Selected Verse'}
                        </button>
                      </div>

                      {isFetchingVerses && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 size={16} className="animate-spin" />
                          {isArabic ? 'جار تحميل الآيات...' : 'Loading verses...'}
                        </div>
                      )}

                      {verseFetchError && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                          {verseFetchError}
                        </div>
                      )}

                      {!isFetchingVerses && !verseFetchError && chapterVerses.length > 0 && (
                        <div className="max-h-56 overflow-y-auto text-sm leading-relaxed text-[#333] whitespace-pre-wrap bg-stone-50 rounded-xl p-4 border border-gray-100">
                          {chapterVerses
                            .filter(verse => verse.verse >= Math.min(selectedStartVerse, selectedEndVerse) && verse.verse <= Math.max(selectedStartVerse, selectedEndVerse))
                            .map(verse => `${verse.verse}. ${verse.text}`)
                            .join('\n')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {isArabic ? 'الآيات المرتبطة المحفوظة' : 'Saved Related Verses'}
                      </label>
                      <p className="text-xs text-gray-400 mt-1">
                        {isArabic ? 'يمكنك تعديل المرجع أو النص بعد إضافته.' : 'You can edit the reference or text after adding it.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addVerse}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#f8eeee] text-[#8b1e1e] rounded-xl font-bold text-sm hover:bg-[#8b1e1e] hover:text-white transition-colors"
                    >
                      <Plus size={16} />
                      {isArabic ? 'إضافة آية يدوياً' : 'Add Manual Verse'}
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
                            placeholder={isArabic ? 'مثال: يوحنا 3:16 (WEB)' : 'Example: John 3:16 (WEB)'}
                            className="px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none md:col-span-1"
                          />
                          <textarea
                            value={verse.text}
                            onChange={e => updateVerse(verse.id, 'text', e.target.value)}
                            rows={3}
                            placeholder={isArabic ? 'نص الآية...' : 'Verse text...'}
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
                    disabled={isSavingDraft}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#8b1e1e] text-white rounded-xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] active:bg-[#3f0f0f] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSavingDraft ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSavingDraft
                      ? (isArabic ? 'جار الحفظ...' : 'Saving...')
                      : (isArabic ? 'حفظ للمراجعة' : 'Save for Pastor Review')}
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
