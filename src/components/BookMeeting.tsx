import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, push } from 'firebase/database';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfDay, isBefore } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, User, Mail, MessageSquare, Ban, Bot, X } from 'lucide-react';
import AIBookingAssistant from '../components/AIBookingAssistant';
import { sendEmailViaEmailJS } from '../services/gmail';

const BUSINESS_START = 9;
const BUSINESS_END = 20;
const SLOT_DURATION = 0.5;

function hourToLabel(h: number, locale: 'en' | 'ar'): string {
  const isAr = locale === 'ar';
  const wholeHour = Math.floor(h);
  const minutes = Math.round((h - wholeHour) * 60);
  const period = wholeHour >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
  const hour12 = wholeHour === 0 ? 12 : wholeHour > 12 ? wholeHour - 12 : wholeHour;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function hourToTime(h: number): string {
  const wholeHour = Math.floor(h);
  const minutes = Math.round((h - wholeHour) * 60);
  return `${String(wholeHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeToHour(t: string): number {
  const [hours, minutes] = t.split(':').map(Number);
  return (hours || 0) + (minutes || 0) / 60;
}

function slotOverlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

interface BusyBlock {
  date: string;
  startHour: number;
  endHour: number;
  title: string;
  type: 'meeting' | 'pending' | 'unavailable';
}

interface AvailabilityBlock {
  date: string;
  startHour: number;
  endHour: number;
  title: string;
}

interface BookMeetingProps {
  isOpen?: boolean;
  onClose?: () => void;
  preSelectedDate?: string;
}

export default function BookMeeting({ isOpen, onClose, preSelectedDate }: BookMeetingProps = {}) {
  const { t, dir, locale } = useI18n();
  const displayLocale = locale as 'en' | 'ar';
  const [currentDate, setCurrentDate] = useState(preSelectedDate ? new Date(preSelectedDate) : new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [meetingBlocks, setMeetingBlocks] = useState<BusyBlock[]>([]);
  const [pendingBlocks, setPendingBlocks] = useState<BusyBlock[]>([]);
  const [unavailableBlocks, setUnavailableBlocks] = useState<BusyBlock[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [isPastDay, setIsPastDay] = useState(false);
  const [pastors, setPastors] = useState<string[]>([]);

  const busyBlocks = [...meetingBlocks, ...pendingBlocks, ...unavailableBlocks];

  useEffect(() => {
    const meetingsRef = ref(database, 'meetings/');
    const unsubscribe = onValue(meetingsRef, (snapshot) => {
      const data = snapshot.val();
      const blocks: BusyBlock[] = [];

      if (data) {
        Object.values(data).forEach((val: any) => {
          if (val.date && val.startTime && val.endTime) {
            blocks.push({
              date: val.date,
              startHour: timeToHour(val.startTime),
              endHour: timeToHour(val.endTime),
              title: val.requestName ? `${t('calendar.meetingWith')} ${val.requestName}` : (val.title || t('booking.meeting')),
              type: 'meeting',
            });
          }
        });
      }

      setMeetingBlocks(blocks);
    });

    return () => unsubscribe();
  }, [t]);

  useEffect(() => {
    const requestsRef = ref(database, 'meetingRequests/');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      const blocks: BusyBlock[] = [];

      if (data) {
        Object.values(data).forEach((val: any) => {
          if (val.date && val.startTime && val.endTime && val.status === 'pending') {
            blocks.push({
              date: val.date,
              startHour: timeToHour(val.startTime),
              endHour: timeToHour(val.endTime),
              title: `${t('booking.requestPrefix')}: ${val.name || t('booking.unknown')}`,
              type: 'pending',
            });
          }
        });
      }

      setPendingBlocks(blocks);
    });

    return () => unsubscribe();
  }, [t]);

  useEffect(() => {
    const unavailabilityRef = ref(database, 'unavailability/');
    const unsubscribe = onValue(unavailabilityRef, (snapshot) => {
      const data = snapshot.val();
      const blocks: BusyBlock[] = [];

      if (data) {
        Object.values(data).forEach((val: any) => {
          if (val.date) {
            const startTime = val.startTime || '00:00';
            const endTime = val.endTime || '23:59';
            blocks.push({
              date: val.date,
              startHour: timeToHour(startTime),
              endHour: timeToHour(endTime),
              title: val.reason || t('booking.unavailable'),
              type: 'unavailable',
            });
          }
        });
      }

      setUnavailableBlocks(blocks);
    });

    return () => unsubscribe();
  }, [t]);

  useEffect(() => {
    const availabilityRef = ref(database, 'availability/');
    const unsubscribe = onValue(availabilityRef, (snapshot) => {
      const data = snapshot.val();
      const blocks: AvailabilityBlock[] = [];

      if (data) {
        Object.values(data).forEach((val: any) => {
          if (val.date) {
            const startTime = val.startTime || '09:00';
            const endTime = val.endTime || '20:00';
            blocks.push({
              date: val.date,
              startHour: timeToHour(startTime),
              endHour: timeToHour(endTime),
              title: val.reason || t('calendar.available'),
            });
          }
        });
      }

      setAvailabilityBlocks(blocks);
    });

    return () => unsubscribe();
  }, [t]);

  useEffect(() => {
    const adminsRef = ref(database, 'admins/');
    const unsubscribe = onValue(adminsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const emails: string[] = [];
        Object.keys(data).forEach(k => {
          emails.push(k.replace(/,/g, '.').toLowerCase().trim());
        });
        setPastors(emails);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (preSelectedDate) {
      const d = new Date(preSelectedDate);
      setSelectedDay(d);
      setCurrentDate(d);
    }
  }, [preSelectedDate]);

  useEffect(() => {
    if (selectedDay && isBefore(startOfDay(selectedDay), startOfDay(new Date()))) {
      setIsPastDay(true);
    } else {
      setIsPastDay(false);
    }
  }, [selectedDay]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getDayBlocks = (day: Date): BusyBlock[] => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return busyBlocks.filter(b => b.date === dayStr);
  };

  const isSlotInsideAvailability = (day: Date, hour: number): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const slotStart = hour;
    const slotEnd = hour + SLOT_DURATION;

    return availabilityBlocks.some(block =>
      block.date === dayStr &&
      slotStart >= block.startHour &&
      slotEnd <= block.endHour
    );
  };

  const isSlotBooked = (day: Date, hour: number): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const slotStart = hour;
    const slotEnd = hour + SLOT_DURATION;

    return [...meetingBlocks, ...pendingBlocks].some(block =>
      block.date === dayStr &&
      slotOverlaps(slotStart, slotEnd, block.startHour, block.endHour)
    );
  };

  const isSlotUnavailable = (day: Date, hour: number): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const slotStart = hour;
    const slotEnd = hour + SLOT_DURATION;

    return unavailableBlocks.some(block =>
      block.date === dayStr &&
      slotOverlaps(slotStart, slotEnd, block.startHour, block.endHour)
    );
  };

  const isSlotInfeasible = (day: Date, hour: number): boolean => {
    const slotEnd = hour + SLOT_DURATION;
    if (hour < BUSINESS_START || slotEnd > BUSINESS_END) return true;

    const dayStr = format(day, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    if (dayStr === todayStr) {
      const now = new Date();
      const nowHour = now.getHours() + now.getMinutes() / 60;
      if (hour <= nowHour) return true;
    }

    if (isBefore(startOfDay(day), startOfDay(new Date()))) return true;
    if (!isSlotInsideAvailability(day, hour)) return true;
    if (isSlotUnavailable(day, hour)) return true;

    return false;
  };

  const handleDayClick = (day: Date) => {
    if (isBefore(startOfDay(day), startOfDay(new Date()))) return;
    setSelectedDay(day);
    setSelectedSlot(null);
    setSuccess(false);
  };

  const handleSlotClick = (hour: number) => {
    if (!selectedDay || isSlotBooked(selectedDay, hour) || isSlotInfeasible(selectedDay, hour)) return;
    setSelectedSlot(hour);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || selectedSlot === null) return;
    setLoading(true);
    try {
      if (isSlotBooked(selectedDay, selectedSlot) || isSlotInfeasible(selectedDay, selectedSlot)) {
        alert(t('booking.timeConflict'));
        return;
      }

      const dateStr = format(selectedDay, 'yyyy-MM-dd');
      const request = {
        name,
        email,
        date: dateStr,
        startTime: hourToTime(selectedSlot),
        endTime: hourToTime(selectedSlot + SLOT_DURATION),
        reason,
        status: 'pending',
        createdAt: Date.now(),
      };
      await push(ref(database, 'meetingRequests/'), request);

      for (const pastorEmail of pastors) {
        try {
          await sendEmailViaEmailJS(pastorEmail, {
            subject: `${t('booking.newMeetingRequestSubject')} ${name}`,
            fullReport: `${t('booking.newMeetingRequestBody')}\n\n${t('booking.name')}: ${name}\n${t('booking.emailLabel')}: ${email}\n${t('booking.date')}: ${dateStr}\n${t('booking.timeLabel')}: ${hourToLabel(selectedSlot, displayLocale)} - ${hourToLabel(selectedSlot + SLOT_DURATION, displayLocale)}\n${t('booking.reason')}: ${reason}\n\n${t('booking.adminInstructions')}`,
          });
        } catch {
          // silently continue
        }
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setReason('');
      setSelectedSlot(null);
    } catch {
      alert(t('booking.failed'));
    } finally {
      setLoading(false);
    }
  };

  const slotStatus = (day: Date, hour: number): 'booked' | 'infeasible' | 'available' => {
    if (isSlotBooked(day, hour)) return 'booked';
    if (isSlotInfeasible(day, hour)) return 'infeasible';
    return 'available';
  };

  const daySlots = selectedDay ? busyBlocks
    .filter(b => b.date === format(selectedDay, 'yyyy-MM-dd'))
    .sort((a, b) => a.startHour - b.startHour) : [];

  const slotHours = Array.from(
    { length: Math.floor((BUSINESS_END - BUSINESS_START) / SLOT_DURATION) },
    (_, index) => BUSINESS_START + index * SLOT_DURATION
  );

  const content = (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-8" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#8b1e1e] flex items-center gap-2">
            <CalendarIcon size={22} />
            {t('booking.pageTitle')}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t('booking.pageDesc')}</p>
        </div>
        <button
          onClick={() => setShowAi(true)}
          className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-5 py-3 rounded-xl font-bold transition-colors text-sm border border-purple-200"
        >
          <Bot size={16} />
          {t('booking.aiAssistant')}
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-xs font-bold">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-50 border border-red-200"></div>{t('booking.legendInfeasible')}</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-50 border border-green-200"></div>{t('booking.legendAvailable')}</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-200 border border-gray-300"></div>{t('booking.legendBooked')}</div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#1A1A1A]">{format(currentDate, 'MMMM yyyy')}</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">{t('calendar.schedule')}</p>
          </div>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map(d => (
            <div key={d} className="text-center text-[10px] uppercase tracking-widest text-gray-400 font-bold">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const dayBlocks = getDayBlocks(day);
            const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                disabled={isPast}
                className={`min-h-[90px] rounded-xl border transition-all text-center p-2 flex flex-col ${
                  isPast
                    ? 'bg-red-50 border-red-100 text-gray-300 cursor-not-allowed opacity-50'
                    : isSelected
                    ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-lg'
                    : today
                    ? 'bg-green-50 border-green-300 text-[#8b1e1e] font-bold'
                    : 'bg-white border-gray-200 hover:border-[#8b1e1e]/30 hover:bg-stone-50'
                }`}
              >
                <div className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>{format(day, 'd')}</div>
                {isPast && <div className="text-[8px] text-gray-300 mt-1">✕</div>}
                {!isPast && dayBlocks.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1 flex-1 justify-end">
                    {dayBlocks.slice(0, 2).map((b, i) => (
                      <div key={i} className={`text-[8px] px-1 py-0.5 rounded truncate ${
                        b.type === 'unavailable'
                          ? (isSelected ? 'bg-white/20 text-white/80' : 'bg-red-100 text-red-600')
                          : (isSelected ? 'bg-white/20 text-white/80' : 'bg-amber-100 text-amber-600')
                      }`}>
                        {b.title}
                      </div>
                    ))}
                    {dayBlocks.length > 2 && (
                      <div className={`text-[8px] ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>+{dayBlocks.length - 2} {t('booking.more')}</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedDay && !isPastDay && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-[#8b1e1e]">
                <Clock size={18} />
                {format(selectedDay, 'EEEE, MMMM d, yyyy')}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={18} /></button>
            </div>

            {daySlots.length > 0 && (
              <div className="mb-6 bg-stone-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Ban size={14} className="text-red-500" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('booking.blockedSlots')}</span>
                </div>
                <div className="space-y-2">
                  {daySlots.map((slot, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold ${
                      slot.type === 'unavailable'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {slot.type === 'unavailable' ? <Ban size={12} /> : <CalendarIcon size={12} />}
                        <span>{slot.title}</span>
                      </div>
                      <span className="opacity-75">{hourToLabel(slot.startHour, displayLocale)} - {hourToLabel(slot.endHour, displayLocale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
              {slotHours.map(hour => {
                const status = slotStatus(selectedDay, hour);
                const isSel = selectedSlot === hour;
                return (
                  <button
                    key={hour}
                    onClick={() => handleSlotClick(hour)}
                    className={`relative p-3 rounded-xl border text-sm font-bold transition-all ${
                      status === 'booked'
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : status === 'infeasible'
                        ? 'bg-red-50 border-red-200 text-red-300 cursor-not-allowed'
                        : isSel
                        ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-md scale-105'
                        : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:scale-102 cursor-pointer'
                    }`}
                  >
                    {hourToLabel(hour, displayLocale)}
                    {status === 'booked' && <div className="text-[9px] mt-1">{t('booking.booked')}</div>}
                    {status === 'infeasible' && <div className="text-[9px] mt-1">—</div>}
                    {status === 'available' && <div className="text-[9px] mt-1 text-green-500">{t('booking.slotAvailable')}</div>}
                  </button>
                );
              })}
            </div>

            {selectedSlot !== null && !success && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-stone-50 rounded-2xl p-5 border border-gray-100">
                <h4 className="font-bold text-sm text-gray-500 mb-3 uppercase tracking-widest">
                  {t('booking.bookFor')} {hourToLabel(selectedSlot, displayLocale)}
                </h4>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1"><User size={12} /> {t('booking.name')}</label>
                    <input required type="text" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm" value={name} onChange={e => setName(e.target.value)} placeholder={t('booking.namePlaceholder')} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Mail size={12} /> {t('booking.email')}</label>
                    <input required type="email" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('booking.emailPlaceholder')} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1"><MessageSquare size={12} /> {t('booking.reason')}</label>
                    <textarea required rows={2} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm resize-none" value={reason} onChange={e => setReason(e.target.value)} placeholder={t('booking.reasonPlaceholder')} />
                  </div>
                  <button disabled={loading} type="submit" className="w-full py-3 bg-[#8B1E1E] text-white rounded-xl font-bold shadow hover:bg-[#641414] transition-all flex items-center justify-center gap-2 text-sm">
                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <><CheckCircle size={14} /> {t('booking.submit')}</>}
                  </button>
                </form>
              </motion.div>
            )}

            {success && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-[#8b1e1e] mb-2">{t('booking.successTitle')}</h4>
                <p className="text-gray-500 text-sm">{t('booking.successDesc')}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedDay && isPastDay && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 rounded-2xl p-5 border border-red-100 text-center">
          <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-bold">{t('booking.pastDay')}</p>
        </motion.div>
      )}

      <AIBookingAssistant isOpen={showAi} onClose={() => setShowAi(false)} />
    </div>
  );

  if (isOpen) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-gray-50 rounded-3xl my-8"
            >
              <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
              {content}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return content;
}
