import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, push, onValue } from 'firebase/database';
import { motion } from 'motion/react';
import { X, Calendar as CalendarIcon, Clock, Send, CheckCircle, User, Mail, MessageSquare, AlertTriangle, Sparkles, Bot, Ban, CalendarCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { format, parseISO } from 'date-fns';
import type { MeetingRequest } from '../types';
import { findAvailableSlot, type CalendarContext, type AISuggestion } from '../services/gemini';
import { sendEmailViaEmailJS } from '../services/gmail';
import AIBookingAssistant from './AIBookingAssistant';

interface BookMeetingProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedDate?: string;
  preSelectedTime?: string;
}

interface BusySlot {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type?: 'meeting' | 'unavailable';
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}

export default function BookMeeting({ isOpen, onClose, preSelectedDate, preSelectedTime }: BookMeetingProps) {
  const { t, dir } = useI18n();
  const [mode, setMode] = useState<'form' | 'ai'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState(preSelectedDate || format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(preSelectedTime || '10:00');
  const [endTime, setEndTime] = useState(preSelectedTime || '11:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [pastors, setPastors] = useState<string[]>([]);
  const [meetings, setMeetings] = useState<{ title: string; date: string; startTime: string; endTime: string }[]>([]);
  const [unavailability, setUnavailability] = useState<BusySlot[]>([]);

  useEffect(() => {
    const meetingsRef = ref(database, 'meetings/');
    const unsubscribe = onValue(meetingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const slots: BusySlot[] = Object.values(data).map((val: any) => ({
          title: val.title || '',
          date: val.date,
          startTime: val.startTime,
          endTime: val.endTime,
          type: 'meeting' as const,
        }));
        setBusySlots(slots);
        setMeetings(slots);
      } else {
        setBusySlots([]);
        setMeetings([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unavailabilityRef = ref(database, 'unavailability/');
    const unsubscribe = onValue(unavailabilityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const slots: BusySlot[] = Object.values(data).map((val: any) => ({
          title: val.reason || 'Unavailable',
          date: val.date,
          startTime: val.startTime || '00:00',
          endTime: val.endTime || '23:59',
          type: 'unavailable' as const,
        }));
        setUnavailability(slots);
      } else {
        setUnavailability([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const adminsRef = ref(database, 'admins/');
    const unsubscribe = onValue(adminsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const emails: string[] = [];
        Object.keys(data).forEach(k => {
          const email = k.replace(/,/g, '.').toLowerCase().trim();
          emails.push(email);
        });
        setPastors(emails);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const allBusy = [...busySlots, ...unavailability];
    const conflict = allBusy.some(slot =>
      slot.date === date && timesOverlap(startTime, endTime, slot.startTime, slot.endTime)
    );
    setIsBusy(conflict);
  }, [date, startTime, endTime, busySlots, unavailability]);

  const daySlots = [...busySlots.filter(s => s.date === date), ...unavailability.filter(s => s.date === date)]
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleGetAiSuggestion = async () => {
    setAiLoading(true);
    try {
      const context: CalendarContext = {
        meetings,
        unavailability,
      };
      const suggestion = await findAvailableSlot(context, 60, date, startTime);
      setAiSuggestion(suggestion);
      setDate(suggestion.suggestedDate);
      setStartTime(suggestion.suggestedStartTime);
      setEndTime(suggestion.suggestedEndTime);
    } catch (err) {
      console.error('AI suggestion failed:', err);
      alert('Failed to get AI suggestion. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) {
      alert(t('booking.timeConflict'));
      return;
    }
    setLoading(true);
    try {
      const request: Omit<MeetingRequest, 'id'> = {
        name,
        email,
        date,
        startTime,
        endTime,
        reason,
        status: 'pending',
        createdAt: Date.now(),
      };
      await push(ref(database, 'meetingRequests/'), request);

      for (const pastorEmail of pastors) {
        try {
          await sendEmailViaEmailJS(pastorEmail, {
            subject: `New Meeting Request from ${name}`,
            fullReport: `A new meeting request has been submitted:\n\nName: ${name}\nEmail: ${email}\nDate: ${date}\nTime: ${startTime} - ${endTime}\nReason: ${reason}\n\nPlease log in to the dashboard to accept or reject this request.`,
          });
        } catch (err) {
          console.error(`Failed to notify pastor ${pastorEmail}:`, err);
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert(t('booking.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setName('');
      setEmail('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setStartTime('10:00');
      setEndTime('11:00');
      setReason('');
      setSuccess(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={handleClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        dir={dir}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
          <h3 className="text-xl font-bold text-[#8B1E1E] flex items-center gap-2">
            <CalendarIcon size={20} />
            {t('booking.title')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === 'form' ? 'ai' : 'form')}
              className="p-2 hover:bg-purple-100 rounded-full transition-colors text-purple-600"
              title="Toggle AI Assistant"
            >
              <Bot size={20} />
            </button>
            <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>

        {mode === 'ai' ? (
          <AIBookingAssistant isOpen={true} onClose={handleClose} preSelectedDate={preSelectedDate} />
        ) : success ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h4 className="text-2xl font-bold text-[#8B1E1E] mb-3">{t('booking.successTitle')}</h4>
            <p className="text-gray-500 mb-8">{t('booking.successDesc')}</p>
            <button onClick={handleClose} className="px-8 py-3 bg-[#8B1E1E] text-white rounded-full font-bold hover:bg-[#641414] transition-colors">
              {t('booking.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <User size={12} />
                {t('booking.name')}
              </label>
              <input required type="text" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder={t('booking.namePlaceholder')} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Mail size={12} />
                {t('booking.email')}
              </label>
              <input required type="email" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('booking.emailPlaceholder')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <CalendarIcon size={12} />
                {t('booking.date')}
              </label>
              <input required type="date" min={format(new Date(), 'yyyy-MM-dd')} className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {/* Blocked Slots Timeline */}
            {daySlots.length > 0 && (
              <div className="col-span-2 bg-stone-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Ban size={14} className="text-red-500" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Blocked on {format(parseISO(date), 'MMM d, yyyy')}</span>
                </div>
                <div className="space-y-2">
                  {daySlots.map((slot, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold ${
                      slot.type === 'unavailable'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {slot.type === 'unavailable' ? <Ban size={12} /> : <CalendarCheck size={12} />}
                        <span>{slot.title}</span>
                      </div>
                      <span className="opacity-75">{slot.startTime} - {slot.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Clock size={12} />
                {t('booking.time')}
              </label>
              <div className="flex gap-2">
                <input required type="time" className="flex-1 px-3 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm" value={startTime} onChange={e => setStartTime(e.target.value)} />
                <input required type="time" className="flex-1 px-3 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
              {isBusy && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-lg text-xs font-bold">
                  <AlertTriangle size={14} />
                  {t('booking.timeConflict')}
                </div>
              )}
            </div>
            </div>

            <button
              type="button"
              onClick={handleGetAiSuggestion}
              disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-50 text-purple-700 rounded-xl font-bold hover:bg-purple-100 transition-colors text-sm border border-purple-200"
            >
              {aiLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-600"></div>
                  Finding best slot...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  AI Suggest Best Time
                </>
              )}
            </button>

            {aiSuggestion && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-purple-700 mb-1">AI Suggestion:</div>
                <div className="text-purple-600">{aiSuggestion.reason}</div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <MessageSquare size={12} />
                {t('booking.reason')}
              </label>
              <textarea required rows={3} className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none resize-none" value={reason} onChange={e => setReason(e.target.value)} placeholder={t('booking.reasonPlaceholder')} />
            </div>

            <button disabled={loading || isBusy} type="submit" className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 ${isBusy ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#8B1E1E] text-white shadow-[#8B1E1E]/10 hover:scale-[1.02] active:scale-98'}`}>
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send size={16} />
                  {t('booking.submit')}
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
