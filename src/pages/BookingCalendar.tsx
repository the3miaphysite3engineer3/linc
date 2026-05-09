import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, push } from 'firebase/database';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfDay, isBefore } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, User, Mail, MessageSquare, Ban, Bot, X } from 'lucide-react';
import AIBookingAssistant from '../components/AIBookingAssistant';
import { sendEmailViaEmailJS } from '../services/gmail';

const BUSINESS_START = 9;
const BUSINESS_END = 20; // don't change this
const SLOT_DURATION = 0.5;

function timeToHour(t: string): number {
  const [hours, minutes] = t.split(':').map(Number);
  return hours + minutes / 60;
}

function hourToLabel(h: number, locale: 'en' | 'ar'): string {
  const isAr = locale === 'ar';

  const hour = Math.floor(h);
  const minutes = Math.round((h - hour) * 60);

  const period = hour >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function hourToTime(h: number): string {
  const hour = Math.floor(h);
  const minutes = Math.round((h - hour) * 60);

  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

interface ScheduleBlock {
  date: string;
  startHour: number;
  endHour: number;
  title: string;
  type: 'meeting' | 'available' | 'unavailable';
}

export default function BookingCalendar() {
  const { t, dir, locale } = useI18n();
  const dateLocale = locale === 'ar' ? ar : enUS;
  const displayLocale = locale as 'en' | 'ar';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [showBookingFormPopup, setShowBookingFormPopup] = useState(false);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPastDay, setIsPastDay] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [pastors, setPastors] = useState<string[]>([]);

  useEffect(() => {
    const availabilityRef = ref(database, 'availability/');

    const unsubscribeAvailability = onValue(availabilityRef, (availabilitySnapshot) => {
      const availabilityData = availabilitySnapshot.val();
      const blocks: ScheduleBlock[] = [];

      if (availabilityData) {
        Object.values(availabilityData).forEach((val: any) => {
          if (val.date) {
            const startTime = val.startTime || '09:00';
            const endTime = val.endTime || '20:00';

            blocks.push({
              date: val.date,
              startHour: timeToHour(startTime),
              endHour: timeToHour(endTime),
              title: val.reason || t('booking.slotAvailable'),
              type: 'available',
            });
          }
        });
      }

      const meetingsRef = ref(database, 'meetings/');
      onValue(meetingsRef, (meetingsSnapshot) => {
        const meetingsData = meetingsSnapshot.val();
        const blocksWithMeetings = [...blocks];

        if (meetingsData) {
          Object.values(meetingsData).forEach((val: any) => {
            if (val.date && val.startTime && val.endTime) {
              blocksWithMeetings.push({
                date: val.date,
                startHour: timeToHour(val.startTime),
                endHour: timeToHour(val.endTime),
                title: t('booking.booked'),
                type: 'meeting',
              });
            }
          });
        }

        const unavailabilityRef = ref(database, 'unavailability/');
        onValue(unavailabilityRef, (unavailabilitySnapshot) => {
          const unavailabilityData = unavailabilitySnapshot.val();
          const finalBlocks = [...blocksWithMeetings];

          if (unavailabilityData) {
            Object.values(unavailabilityData).forEach((val: any) => {
              if (val.date) {
                const startTime = val.startTime || '00:00';
                const endTime = val.endTime || '23:59';

                finalBlocks.push({
                  date: val.date,
                  startHour: timeToHour(startTime),
                  endHour: timeToHour(endTime),
                  title: t('booking.booked'),
                  type: 'unavailable',
                });
              }
            });
          }

          setScheduleBlocks(finalBlocks);
        });
      });
    });

    return () => unsubscribeAvailability();
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
    if (selectedDay && isBefore(startOfDay(selectedDay), startOfDay(new Date()))) {
      setIsPastDay(true);
      setShowDayPopup(false);
      setShowBookingFormPopup(false);
    } else {
      setIsPastDay(false);
    }
  }, [selectedDay]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getDayBlocks = (day: Date): ScheduleBlock[] => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return scheduleBlocks.filter(b => b.date === dayStr);
  };

  const isSlotInsideAvailability = (day: Date, hour: number): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd');

    return scheduleBlocks.some(b =>
      b.date === dayStr &&
      b.type === 'available' &&
      hour >= b.startHour &&
      hour + SLOT_DURATION <= b.endHour
    );
  };

  const isSlotUnavailable = (day: Date, hour: number): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const slotEnd = hour + SLOT_DURATION;

    return scheduleBlocks.some(b =>
      b.date === dayStr &&
      b.type === 'unavailable' &&
      hour < b.endHour &&
      slotEnd > b.startHour
    );
  };

  const isSlotBooked = (day: Date, hour: number): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const slotEnd = hour + SLOT_DURATION;

    return scheduleBlocks.some(b =>
      b.date === dayStr &&
      b.type === 'meeting' &&
      hour < b.endHour &&
      slotEnd > b.startHour
    );
  };

  const isSlotInfeasible = (day: Date, hour: number): boolean => {
    if (hour < BUSINESS_START || hour + SLOT_DURATION > BUSINESS_END) return true;

    if (!isSlotInsideAvailability(day, hour)) return true;

    if (isSlotUnavailable(day, hour)) return true;

    const dayStr = format(day, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    if (dayStr === todayStr) {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;

      if (hour <= currentHour) return true;
    }

    if (isBefore(startOfDay(day), startOfDay(new Date()))) return true;

    return false;
  };

  const slotStatus = (day: Date, hour: number): 'booked' | 'infeasible' | 'available' => {
    if (isSlotBooked(day, hour)) return 'booked';
    if (isSlotInfeasible(day, hour)) return 'infeasible';
    return 'available';
  };

  const handleDayClick = (day: Date) => {
    if (isBefore(startOfDay(day), startOfDay(new Date()))) return;

    setSelectedDay(day);
    setSelectedSlot(null);
    setSuccess(false);
    setShowDayPopup(true);
  };

  const handleSlotClick = (hour: number) => {
    if (!selectedDay || isSlotBooked(selectedDay, hour) || isSlotInfeasible(selectedDay, hour)) return;

    setSelectedSlot(hour);
    setSuccess(false);
  };

  const handlePopupSlotClick = (hour: number) => {
    handleSlotClick(hour);
    setShowDayPopup(false);
    setShowBookingFormPopup(true);
  };

  const closeSelectedDay = () => {
    setSelectedDay(null);
    setSelectedSlot(null);
    setSuccess(false);
    setShowDayPopup(false);
    setShowBookingFormPopup(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || selectedSlot === null) return;

    if (isSlotBooked(selectedDay, selectedSlot) || isSlotInfeasible(selectedDay, selectedSlot)) return;

    setLoading(true);

    try {
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
        } catch (err) {
          console.error(`Failed to notify pastor ${pastorEmail}:`, err);
        }
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setReason('');
      setSelectedSlot(null);
      setShowDayPopup(false);
      setShowBookingFormPopup(true);
    } catch (err) {
      console.error(err);
      alert(t('booking.failed'));
    } finally {
      setLoading(false);
    }
  };

  const daySlots = selectedDay ? scheduleBlocks.filter(b => b.date === format(selectedDay, 'yyyy-MM-dd')) : [];

  const numberOfSlots = Math.floor((BUSINESS_END - BUSINESS_START) / SLOT_DURATION);

  const slotHours = Array.from({ length: numberOfSlots }).map((_, i) => BUSINESS_START + i * SLOT_DURATION);

  const availableSlotHours = selectedDay
    ? slotHours.filter(hour => slotStatus(selectedDay, hour) === 'available')
    : [];

  const selectedDayTitle = selectedDay ? format(selectedDay, 'EEEE, MMMM d, yyyy', { locale: dateLocale }) : '';

  const dayPopup = (
    <AnimatePresence>
      {selectedDay && !isPastDay && showDayPopup && (
        <motion.div
          key="booking-day-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-md px-4 py-6"
          onClick={() => setShowDayPopup(false)}
          dir={dir}
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <motion.div
            key="booking-day-popup-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-white/70"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#8b1e1e] px-6 py-5 text-white">
              <button
                type="button"
                onClick={() => setShowDayPopup(false)}
                className="absolute top-4 end-4 rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 pe-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Clock size={24} />
                </div>

                <div>
                  <h3 className="text-xl font-bold">
                    {t('booking.legendAvailable')} {t('booking.timeLabel')}
                  </h3>
                  <p className="mt-1 text-sm text-white/80">
                    {selectedDayTitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-6">
              {availableSlotHours.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {availableSlotHours.map(hour => {
                    const isSel = selectedSlot === hour;

                    return (
                      <button
                        type="button"
                        key={hour}
                        onClick={() => handlePopupSlotClick(hour)}
                        className={`rounded-2xl border p-4 text-sm font-bold transition-all ${
                          isSel
                            ? 'scale-[1.02] border-[#8b1e1e] bg-[#8b1e1e] text-white shadow-lg'
                            : 'border-green-200 bg-green-50 text-green-700 hover:-translate-y-0.5 hover:border-green-300 hover:bg-green-100 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Clock size={15} />
                          <span>{hourToLabel(hour, displayLocale)}</span>
                        </div>

                        <div className={`mt-1 text-[10px] ${isSel ? 'text-white/80' : 'text-green-500'}`}>
                          {t('booking.slotAvailable')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                    <AlertCircle size={30} className="text-red-500" />
                  </div>

                  <p className="font-bold text-[#8b1e1e]">
                    {t('booking.noAvailabilityOpenedForDay')}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    {t('booking.legendInfeasible')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const bookingFormPopup = (
    <AnimatePresence>
      {selectedDay && !isPastDay && showBookingFormPopup && selectedSlot !== null && (
        <motion.div
          key="booking-form-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 backdrop-blur-md px-4 py-6"
          onClick={() => {
            if (!loading) setShowBookingFormPopup(false);
          }}
          dir={dir}
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <motion.div
            key="booking-form-popup-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-white/70"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#8b1e1e] px-6 py-5 text-white">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowBookingFormPopup(false)}
                className="absolute top-4 end-4 rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 pe-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <CheckCircle size={24} />
                </div>

                <div>
                  <h3 className="text-xl font-bold">
                    {t('booking.bookFor')} {hourToLabel(selectedSlot, displayLocale)}
                  </h3>
                  <p className="mt-1 text-sm text-white/80">
                    {selectedDayTitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {success ? (
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h4 className="text-xl font-bold text-[#8b1e1e] mb-2">{t('booking.successTitle')}</h4>
                  <p className="text-gray-500 text-sm">{t('booking.successDesc')}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingFormPopup(false);
                      setSuccess(false);
                    }}
                    className="mt-6 px-5 py-2.5 rounded-xl bg-[#8b1e1e] text-white font-bold text-sm hover:bg-[#641414] transition-colors"
                  >
                    {t('booking.close')}
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                      <User size={12} /> {t('booking.name')}
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('booking.namePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                      <Mail size={12} /> {t('booking.email')}
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('booking.emailPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                      <MessageSquare size={12} /> {t('booking.reason')}
                    </label>
                    <textarea
                      required
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm resize-none"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder={t('booking.reasonPlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setShowBookingFormPopup(false);
                        setShowDayPopup(true);
                      }}
                      className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {t('booking.close')}
                    </button>

                    <button
                      disabled={loading}
                      type="submit"
                      className="py-3 bg-[#8B1E1E] text-white rounded-xl font-bold shadow hover:bg-[#641414] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <CheckCircle size={14} /> {t('booking.submit')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
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
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>{t('booking.legendInfeasible')}</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-50 border border-green-200"></div>{t('booking.legendAvailable')}</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-200 border border-gray-300"></div>{t('booking.legendBooked')}</div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#1A1A1A]">{format(currentDate, 'MMMM yyyy', { locale: dateLocale })}</h2>
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
              const visibleDayBlocks = dayBlocks.filter(b => b.type !== 'available');
              const availabilityBlocks = dayBlocks.filter(b => b.type === 'available');
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const today = isToday(day);
              const hasAvailability = availabilityBlocks.length > 0;

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
                      : hasAvailability
                      ? 'bg-green-50 border-green-200 hover:border-[#8b1e1e]/30 hover:bg-stone-50'
                      : 'bg-red-50 border-red-100 text-gray-400 hover:border-[#8b1e1e]/30'
                  }`}
                >
                  <div className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>{format(day, 'd', { locale: dateLocale })}</div>
                  {isPast && <div className="text-[8px] text-gray-300 mt-1">✕</div>}
                  {!isPast && !hasAvailability && (
                    <div className="text-[8px] text-red-400 mt-1">{t('booking.unavailable')}</div>
                  )}
                  {!isPast && hasAvailability && (
                    <div className={`text-[8px] mt-1 ${isSelected ? 'text-white/80' : 'text-green-600'}`}>{t('booking.slotAvailable')}</div>
                  )}
                  {!isPast && visibleDayBlocks.length > 0 && (
                    <div className="flex flex-col gap-0.5 mt-1 flex-1 justify-end">
                      {visibleDayBlocks.slice(0, 2).map((b, i) => (
                        <div key={i} className={`text-[8px] px-1 py-0.5 rounded truncate ${
                          b.type === 'unavailable'
                            ? (isSelected ? 'bg-white/20 text-white/80' : 'bg-red-100 text-red-600')
                            : (isSelected ? 'bg-white/20 text-white/80' : 'bg-amber-100 text-amber-600')
                        }`}>
                          {b.title}
                        </div>
                      ))}
                      {visibleDayBlocks.length > 2 && (
                        <div className={`text-[8px] ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>+{visibleDayBlocks.length - 2} {t('booking.more')}</div>
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
                  {format(selectedDay, 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
                </h3>
                <button onClick={closeSelectedDay} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={18} /></button>
              </div>

              {daySlots.length > 0 && (
                <div className="mb-6 bg-stone-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Ban size={14} className="text-red-500" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('booking.scheduleBlocks')}</span>
                  </div>
                  <div className="space-y-2">
                    {daySlots.map((slot, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold ${
                        slot.type === 'available'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : slot.type === 'unavailable'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {slot.type === 'available' ? <CheckCircle size={12} /> : slot.type === 'unavailable' ? <Ban size={12} /> : <CalendarIcon size={12} />}
                          <span>{slot.title}</span>
                        </div>
                        <span className="opacity-75">{hourToLabel(slot.startHour, displayLocale)} - {hourToLabel(slot.endHour, displayLocale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {daySlots.filter(slot => slot.type === 'available').length === 0 && (
                <div className="mb-6 bg-red-50 rounded-xl p-4 border border-red-100 text-center">
                  <AlertCircle size={22} className="text-red-500 mx-auto mb-2" />
                  <p className="text-red-600 font-bold text-sm">{t('booking.noAvailabilityOpenedForDay')}</p>
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

      {dayPopup}
      {bookingFormPopup}
    </>
  );
}
