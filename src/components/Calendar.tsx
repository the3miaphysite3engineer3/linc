import React, { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';
import type { Meeting, MeetingRequest } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { Plus, Trash2, Video, MapPin, Clock, X, ChevronLeft, ChevronRight, Wand2, LogOut, Send, Users, Check, ChevronDown, Calendar as CalendarIcon, CheckCircle, XCircle, Hourglass, Mail, User, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import {
  createCalendarMeetLink,
  generatePlaceholderLink,
  startGoogleAuth,
  handleOAuthCallback,
  getStoredTokens,
  storeTokens,
  clearTokens,
  sendGmailEmail,
  type GmailTokens,
} from '../services/gmail';
import PageTitle from './PageTitle';
import { useI18n } from '../i18n';
import OpenAI from 'openai';

const SLOT_BLOCK_START = 9;
const SLOT_BLOCK_END = 20;
const SLOT_BLOCK_DURATION = 0.5;

function timeToHour(time?: string): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours + (minutes || 0) / 60;
}

function hourToTime(hourValue: number): string {
  const hours = Math.floor(hourValue);
  const minutes = Math.round((hourValue - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function hourToLabel(hourValue: number, locale: 'en' | 'ar'): string {
  const isAr = locale === 'ar';
  const hours = Math.floor(hourValue);
  const minutes = Math.round((hourValue - hours) * 60);
  const period = hours >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function timeToLabel(time: string | undefined, locale: 'en' | 'ar'): string {
  return hourToLabel(timeToHour(time || '00:00'), locale);
}

function timeRangeToLabel(startTime: string | undefined, endTime: string | undefined, locale: 'en' | 'ar'): string {
  return `${timeToLabel(startTime, locale)} - ${timeToLabel(endTime, locale)}`;
}


function buildTimeOptions(startHour: number, endHour: number, step: number = 0.5): { value: string; hour: number }[] {
  const options: { value: string; hour: number }[] = [];

  for (let hour = startHour; hour <= endHour; hour += step) {
    const roundedHour = Math.round(hour * 100) / 100;
    options.push({ value: hourToTime(roundedHour), hour: roundedHour });
  }

  return options;
}

const MEETING_TIME_OPTIONS = buildTimeOptions(0, 23.5);
const BOOKING_WINDOW_TIME_OPTIONS = buildTimeOptions(SLOT_BLOCK_START, SLOT_BLOCK_END);
const FULL_DAY_TIME_OPTIONS = buildTimeOptions(0, 23.5);

function slotOverlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  primaryGift: string;
}

interface Availability {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  allDay?: boolean;
}

interface Unavailability {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  allDay?: boolean;
}

interface AvailabilityForm {
  mode: 'single' | 'multiple';
  date: string;
  startDate: string;
  endDate: string;
  selectedWeekdays: number[];
  startTime: string;
  endTime: string;
  reason: string;
  allDay: boolean;
}

interface UnavailabilityForm {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  allDay: boolean;
}

export default function Calendar() {
  const { t, dir, locale } = useI18n();
  const displayLocale = locale === 'ar' ? 'ar' : 'en';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleTokens, setGoogleTokens] = useState<GmailTokens | null>(() => getStoredTokens());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [selectedSlotDay, setSelectedSlotDay] = useState<Date | null>(null);
  const [slotBlockingLoading, setSlotBlockingLoading] = useState(false);

  const [availability, setAvailability] = useState<Availability[]>([]);
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);

  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null);
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityForm>({
    mode: 'single',
    date: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    startTime: '09:00',
    endTime: '20:00',
    reason: '',
    allDay: true,
  });

  const [showUnavailabilityModal, setShowUnavailabilityModal] = useState(false);
  const [editingUnavailability, setEditingUnavailability] = useState<Unavailability | null>(null);
  const [unavailabilityForm, setUnavailabilityForm] = useState<UnavailabilityForm>({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '20:00',
    reason: '',
    allDay: true,
  });

  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string; timestamp: Date }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const tokens = handleOAuthCallback();
    if (tokens && !tokens.error) {
      storeTokens(tokens);
      setGoogleTokens(tokens);
    }
  }, []);

  useEffect(() => {
    const formRef = ref(database, 'form/');
    const unsubscribe = onValue(formRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: Participant[] = Object.entries(data)
          .map(([id, val]: [string, any]) => {
            const fullName = val.fields?.trainee?.fullName?.value || '';
            const email = val.fields?.trainee?.email?.value || '';
            const result = val.results;
            const lang = val.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English';
            const primaryGift = result?.[lang]?.primaryGift || '';
            return { id, name: fullName, email, primaryGift };
          })
          .filter(p => p.name && p.email);
        setParticipants(parsed);
      } else {
        setParticipants([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const meetingsRef = ref(database, 'meetings/');
    const unsubscribe = onValue(meetingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...(val as Meeting),
        }));
        (parsed as Meeting[]).sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return a.date.localeCompare(b.date);
        });
        setMeetings(parsed);
      } else {
        setMeetings([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const requestsRef = ref(database, 'meetingRequests/');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...(val as MeetingRequest),
        }));
        (parsed as MeetingRequest[]).sort((a, b) => a.createdAt - b.createdAt);
        setMeetingRequests(parsed);
      } else {
        setMeetingRequests([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const availabilityRef = ref(database, 'availability/');
    const unsubscribe = onValue(availabilityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data).map(([firebaseId, val]: [string, any]) => ({
          id: firebaseId,
          date: val.date,
          startTime: val.startTime,
          endTime: val.endTime,
          reason: val.reason || '',
          allDay: val.allDay || false,
        }));
        parsed.sort((a, b) => a.date.localeCompare(b.date));
        setAvailability(parsed);
      } else {
        setAvailability([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unavailabilityRef = ref(database, 'unavailability/');
    const unsubscribe = onValue(unavailabilityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data).map(([firebaseId, val]: [string, any]) => ({
          id: firebaseId,
          date: val.date,
          startTime: val.startTime,
          endTime: val.endTime,
          reason: val.reason || '',
          allDay: val.allDay || false,
        }));
        parsed.sort((a, b) => a.date.localeCompare(b.date));
        setUnavailability(parsed);
      } else {
        setUnavailability([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    location: '',
    meetLink: '',
    type: 'service',
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const resetAvailabilityForm = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setAvailabilityForm({
      mode: 'single',
      date: today,
      startDate: today,
      endDate: today,
      selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
      startTime: '09:00',
      endTime: '20:00',
      reason: '',
      allDay: true,
    });
  };

  const resetUnavailabilityForm = () => {
    setUnavailabilityForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '20:00',
      reason: '',
      allDay: true,
    });
  };

  const buildAvailabilityDates = (): string[] => {
    if (availabilityForm.mode === 'single') {
      return [availabilityForm.date];
    }

    const start = parseISO(availabilityForm.startDate);
    const end = parseISO(availabilityForm.endDate);

    if (end < start) {
      return [];
    }

    return eachDayOfInterval({ start, end })
      .filter(day => availabilityForm.selectedWeekdays.includes(day.getDay()))
      .map(day => format(day, 'yyyy-MM-dd'));
  };

  const toggleAvailabilityWeekday = (weekday: number) => {
    setAvailabilityForm(prev => {
      const alreadySelected = prev.selectedWeekdays.includes(weekday);
      const nextSelected = alreadySelected
        ? prev.selectedWeekdays.filter(d => d !== weekday)
        : [...prev.selectedWeekdays, weekday].sort((a, b) => a - b);

      return {
        ...prev,
        selectedWeekdays: nextSelected,
      };
    });
  };

  const getMeetingDisplayTitle = (meeting: Meeting): string => {
    const requestName = (meeting as any).requestName;

    if (requestName) {
      return `${t('calendar.meetingWith')} ${requestName}`;
    }

    return meeting.title || t('calendar.meeting');
  };

  const getMeetingRequestEmail = (meeting: Meeting): string => {
    return (meeting as any).requestEmail || '';
  };

  const getMeetingRequestReason = (meeting: Meeting): string => {
    return (meeting as any).requestReason || '';
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const sendEmails = async (meetingData: { title: string; date: string; startTime: string; endTime: string; location: string; meetLink: string }) => {
    if (selectedParticipants.length === 0 || !googleTokens) return true;

    const selected = participants.filter(p => selectedParticipants.includes(p.id));

    for (const p of selected) {
      if (!p.email) continue;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f4f0; border-radius: 22px;">
          <div style="background: #8b1e1e; color: white; padding: 16px; border-radius: 14px; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 20px;">LINC Church Meeting Invitation</h1>
          </div>
          <p style="color: #333; font-size: 15px;">Dear ${p.name},</p>
          <p style="color: #555; font-size: 14px;">You are invited to attend the following meeting:</p>
          <div style="background: white; padding: 16px; border-radius: 14px; border: 1px solid #e5e5e5; margin-bottom: 16px;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Meeting:</strong> ${meetingData.title}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Date:</strong> ${format(parseISO(meetingData.date), 'EEEE, MMMM d, yyyy')}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Time:</strong> ${timeRangeToLabel(meetingData.startTime, meetingData.endTime, displayLocale)}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Location:</strong> ${meetingData.location || 'TBA'}</p>
            ${meetingData.meetLink ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Google Meet:</strong> <a href="${meetingData.meetLink}">${meetingData.meetLink}</a></p>` : ''}
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">We look forward to seeing you there.</p>
        </div>
      `.trim();

      try {
        await sendGmailEmail(googleTokens, p.email, `Meeting Invitation: ${meetingData.title}`, htmlBody);
      } catch (err) {
        console.error(`Failed to send email to ${p.email}:`, err);
      }
    }

    return true;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailSent(false);

    try {
      const meetingData = {
        title: newMeeting.title || '',
        date: newMeeting.date || '',
        startTime: newMeeting.startTime || '',
        endTime: newMeeting.endTime || '',
        location: newMeeting.location || '',
        meetLink: newMeeting.meetLink || '',
        type: newMeeting.type || 'service',
        participantIds: selectedParticipants,
        updatedAt: Date.now(),
      };

      if (editingMeeting) {
        const updateRef = ref(database, `meetings/${editingMeeting.id}`);
        await import('firebase/database').then(({ update }) => update(updateRef, meetingData));
      } else {
        const { push } = await import('firebase/database');
        await push(ref(database, 'meetings/'), meetingData);
      }

      const emailSuccess = await sendEmails({
        title: meetingData.title,
        date: meetingData.date,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        location: meetingData.location,
        meetLink: meetingData.meetLink,
      });
      setEmailSent(emailSuccess);

      setIsAddOpen(false);
      setEditingMeeting(null);
      setSelectedParticipants([]);
      setNewMeeting({
        title: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '10:00',
        endTime: '11:00',
        location: '',
        meetLink: '',
        type: 'service',
      });
    } catch (err) {
      console.error(err);
      alert(t('calendar.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('calendar.confirmDelete'))) {
      try {
        const { remove } = await import('firebase/database');
        await remove(ref(database, `meetings/${id}`));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { push, update } = await import('firebase/database');

      const availabilityData = {
        date: availabilityForm.date,
        startTime: availabilityForm.allDay ? '09:00' : availabilityForm.startTime,
        endTime: availabilityForm.allDay ? '20:00' : availabilityForm.endTime,
        reason: availabilityForm.reason || '',
        allDay: availabilityForm.allDay,
        updatedAt: Date.now(),
      };

      if (editingAvailability) {
        await update(ref(database, `availability/${editingAvailability.id}`), availabilityData);
      } else {
        const selectedDates = buildAvailabilityDates();

        if (selectedDates.length === 0) {
          alert(t('calendar.noAvailableDatesSelected'));
          return;
        }

        await Promise.all(
          selectedDates.map(date =>
            push(ref(database, 'availability/'), {
              ...availabilityData,
              date,
            })
          )
        );
      }

      setShowAvailabilityModal(false);
      setEditingAvailability(null);
      resetAvailabilityForm();
    } catch (err) {
      console.error(err);
      alert(t('calendar.saveAvailabilityFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (confirm(t('calendar.removeAvailabilityConfirm'))) {
      try {
        const { remove } = await import('firebase/database');
        await remove(ref(database, `availability/${id}`));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateUnavailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { push, update } = await import('firebase/database');

      const unavailabilityData = {
        date: unavailabilityForm.date,
        startTime: unavailabilityForm.allDay ? '00:00' : unavailabilityForm.startTime,
        endTime: unavailabilityForm.allDay ? '23:59' : unavailabilityForm.endTime,
        reason: unavailabilityForm.reason || '',
        allDay: unavailabilityForm.allDay,
        updatedAt: Date.now(),
      };

      if (editingUnavailability) {
        await update(ref(database, `unavailability/${editingUnavailability.id}`), unavailabilityData);
      } else {
        await push(ref(database, 'unavailability/'), unavailabilityData);
      }

      setShowUnavailabilityModal(false);
      setEditingUnavailability(null);
      resetUnavailabilityForm();
    } catch (err) {
      console.error(err);
      alert(t('calendar.saveUnavailabilityFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnavailability = async (id: string) => {
    if (confirm(t('calendar.removeUnavailabilityConfirm'))) {
      try {
        const { remove } = await import('firebase/database');
        await remove(ref(database, `unavailability/${id}`));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAiAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMessage = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setAiLoading(true);

    try {
      const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!OPENROUTER_API_KEY) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: 'AI is not configured. Please add VITE_OPENROUTER_API_KEY to your .env file.', timestamp: new Date() }]);
        return;
      }

      const calendarContext = {
        meetings: meetings.map(m => ({
          title: getMeetingDisplayTitle(m),
          date: m.date,
          startTime: m.startTime,
          endTime: m.endTime,
          requesterEmail: getMeetingRequestEmail(m),
          requestReason: getMeetingRequestReason(m),
        })),
        availability: availability.map(a => ({
          id: a.id,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          allDay: a.allDay,
          reason: a.reason,
        })),
        unavailability: unavailability.map(u => ({
          id: u.id,
          date: u.date,
          startTime: u.startTime,
          endTime: u.endTime,
          allDay: u.allDay,
          reason: u.reason,
        })),
        pendingRequests: meetingRequests.filter(r => r.status === 'pending').map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          date: r.date,
          startTime: r.startTime,
          endTime: r.endTime,
          reason: r.reason,
        })),
      };

      const systemPrompt = `You are an AI assistant for a church pastor to manage their calendar.

The database scheduling model is:
- availability/ opens bookable time.
- unavailability/ closes time and overrides availability.
- meetings/ contains confirmed meetings.
- meetingRequests/ contains pending requests.

You can help with:
1. Adding availability - say "I'm available on [date]" or "make [date] available from [time] to [time]"
2. Adding unavailability - say "I'm unavailable on [date]" or "block [date] from [time] to [time]"
3. Accepting meeting requests - say "accept request from [name]" or "accept request #[id]"
4. Rejecting meeting requests - say "reject request from [name]" or "reject request #[id]"
5. Viewing schedule - say "show my schedule" or "what's my calendar look like"

Current calendar context:
${JSON.stringify(calendarContext, null, 2)}

When the user wants to add availability, respond with: ACTION:ADD_AVAILABILITY|date|startTime|endTime|reason
When the user wants to add unavailability, respond with: ACTION:ADD_UNAVAILABILITY|date|startTime|endTime|reason
When the user wants to accept a request, respond with: ACTION:ACCEPT_REQUEST|requestId
When the user wants to reject a request, respond with: ACTION:REJECT_REQUEST|requestId

Otherwise, provide a helpful response about their calendar.`;

      const client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: OPENROUTER_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const apiResponse = await client.chat.completions.create({
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ] as any,
        reasoning: { enabled: true },
      } as any);

      const aiResponse = apiResponse.choices?.[0]?.message?.content || 'I could not process that request.';

      if (aiResponse.startsWith('ACTION:')) {
        const [action, ...params] = aiResponse.split('|');

        if (action === 'ACTION:ADD_AVAILABILITY' && params.length >= 3) {
          const [date, startTime, endTime, reason = ''] = params;
          const { push } = await import('firebase/database');
          await push(ref(database, 'availability/'), {
            date,
            startTime,
            endTime,
            reason,
            allDay: startTime === '09:00' && endTime === '20:00',
            updatedAt: Date.now(),
          });
          setAiMessages(prev => [...prev, { role: 'assistant', content: `✅ Added availability for ${date}${reason ? ` (${reason})` : ''}.`, timestamp: new Date() }]);
        } else if (action === 'ACTION:ADD_UNAVAILABILITY' && params.length >= 3) {
          const [date, startTime, endTime, reason = ''] = params;
          const { push } = await import('firebase/database');
          await push(ref(database, 'unavailability/'), {
            date,
            startTime,
            endTime,
            reason,
            allDay: startTime === '00:00' && endTime === '23:59',
            updatedAt: Date.now(),
          });
          setAiMessages(prev => [...prev, { role: 'assistant', content: `✅ Added unavailability for ${date}${reason ? ` (${reason})` : ''}.`, timestamp: new Date() }]);
        } else if (action === 'ACTION:ACCEPT_REQUEST' && params[0]) {
          const requestId = params[0];
          await handleRequestStatus(requestId, 'accepted');
          setAiMessages(prev => [...prev, { role: 'assistant', content: '✅ Meeting request accepted. A meeting has been created and the requester has been notified.', timestamp: new Date() }]);
        } else if (action === 'ACTION:REJECT_REQUEST' && params[0]) {
          const requestId = params[0];
          await handleRequestStatus(requestId, 'rejected');
          setAiMessages(prev => [...prev, { role: 'assistant', content: '✅ Meeting request rejected. The requester has been notified.', timestamp: new Date() }]);
        } else {
          setAiMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: new Date() }]);
        }
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: new Date() }]);
      }
    } catch (err) {
      console.error('AI assistant error:', err);
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRequestStatus = async (id: string, status: 'accepted' | 'rejected') => {
    try {
      const { update } = await import('firebase/database');
      await update(ref(database, `meetingRequests/${id}`), { status });

      if (status === 'accepted') {
        const req = meetingRequests.find(r => r.id === id);
        if (req) {
          let meetLink = generatePlaceholderLink();
          if (googleTokens) {
            try {
              const created = await createCalendarMeetLink(googleTokens, `${t('calendar.meetingWith')} ${req.name}`, req.date, req.startTime, req.endTime);
              meetLink = created.meetLink;
            } catch (err) {
              console.error('Failed to create real Meet link, using placeholder:', err);
            }
          }

          const { push } = await import('firebase/database');
          await push(ref(database, 'meetings/'), {
            title: t('calendar.meetingWithPastor'),
            date: req.date,
            startTime: req.startTime,
            endTime: req.endTime,
            location: '',
            meetLink,
            type: 'counseling',
            participantIds: [],
            requestName: req.name,
            requestEmail: req.email,
            requestReason: req.reason || '',
            sourceRequestId: id,
            updatedAt: Date.now(),
          });

          try {
            const tokens = googleTokens || getStoredTokens();
            if (tokens) {
              const emailHtml = `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f5f4f0;border-radius:22px;">
                  <div style="background:#8b1e1e;color:white;padding:16px;border-radius:14px;text-align:center;margin-bottom:20px;">
                    <h1 style="margin:0;font-size:20px;">${t('booking.acceptedEmailTitle')}</h1>
                  </div>
                  <p style="color:#333;font-size:15px;">Dear ${req.name},</p>
                  <p style="color:#555;font-size:14px;">${t('booking.acceptedEmailBody')}</p>
                  <div style="background:white;padding:16px;border-radius:14px;border:1px solid #e5e5e5;margin-bottom:16px;">
                    <p style="margin:4px 0;font-size:14px;"><strong>${t('calendar.meeting')}:</strong> ${t('calendar.meetingWithPastor')}</p>
                    <p style="margin:4px 0;font-size:14px;"><strong>Date:</strong> ${format(parseISO(req.date), 'EEEE, MMMM d, yyyy')}</p>
                    <p style="margin:4px 0;font-size:14px;"><strong>Time:</strong> ${timeRangeToLabel(req.startTime, req.endTime, displayLocale)}</p>
                    ${req.reason ? `<p style="margin:4px 0;font-size:14px;"><strong>Reason:</strong> ${req.reason}</p>` : ''}
                    ${meetLink ? `<p style="margin:8px 0;font-size:14px;"><strong>Google Meet:</strong> <a href="${meetLink}" style="color:#8b1e1e;font-weight:bold;">Join Meeting</a></p>` : ''}
                  </div>
                  <p style="color:#999;font-size:12px;margin-top:24px;">God bless.</p>
                </div>
              `.trim();

              await sendGmailEmail(tokens, req.email, t('booking.acceptedEmailSubject'), emailHtml);
            }
          } catch (emailErr) {
            console.error('Failed to send acceptance email:', emailErr);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert(t('booking.statusFailed'));
    }
  };

  const getDateString = (day: Date): string => format(day, 'yyyy-MM-dd');

  const getAvailabilityBlocksForDate = (dateStr: string): Availability[] => {
    return availability.filter(a => a.date === dateStr);
  };

  const getUnavailabilityBlocksForDate = (dateStr: string): Unavailability[] => {
    return unavailability.filter(u => u.date === dateStr);
  };

  const getMeetingsForDate = (dateStr: string): Meeting[] => {
    return meetings.filter(m => m.date === dateStr);
  };

  const getPendingRequestsForDate = (dateStr: string): MeetingRequest[] => {
    return meetingRequests.filter(r => r.date === dateStr && r.status === 'pending');
  };

  const getAvailabilityRange = (block: Availability): { start: number; end: number } => {
    return {
      start: timeToHour(block.startTime || '09:00'),
      end: timeToHour(block.endTime || '20:00'),
    };
  };

  const getUnavailabilityRange = (block: Unavailability): { start: number; end: number } => {
    return {
      start: timeToHour(block.startTime || '00:00'),
      end: timeToHour(block.endTime || '23:59'),
    };
  };

  const isPastorSlotInsideAvailability = (dateStr: string, startHour: number, endHour: number): boolean => {
    return getAvailabilityBlocksForDate(dateStr).some(block => {
      const range = getAvailabilityRange(block);
      return startHour >= range.start && endHour <= range.end;
    });
  };

  const getBlockingUnavailabilityForSlot = (dateStr: string, startHour: number, endHour: number): Unavailability | null => {
    return getUnavailabilityBlocksForDate(dateStr).find(block => {
      const range = getUnavailabilityRange(block);
      return slotOverlaps(startHour, endHour, range.start, range.end);
    }) || null;
  };

  const isPastorSlotBooked = (dateStr: string, startHour: number, endHour: number): boolean => {
    const meetingBooked = getMeetingsForDate(dateStr).some(meeting => {
      if (!meeting.startTime || !meeting.endTime) return false;
      return slotOverlaps(startHour, endHour, timeToHour(meeting.startTime), timeToHour(meeting.endTime));
    });

    const requestBooked = getPendingRequestsForDate(dateStr).some(request => {
      if (!request.startTime || !request.endTime) return false;
      return slotOverlaps(startHour, endHour, timeToHour(request.startTime), timeToHour(request.endTime));
    });

    return meetingBooked || requestBooked;
  };

  const getPastorSlotStatus = (day: Date, startHour: number): 'available' | 'blocked' | 'booked' | 'closed' => {
    const dateStr = getDateString(day);
    const endHour = startHour + SLOT_BLOCK_DURATION;

    if (isPastorSlotBooked(dateStr, startHour, endHour)) return 'booked';
    if (getBlockingUnavailabilityForSlot(dateStr, startHour, endHour)) return 'blocked';
    if (isPastorSlotInsideAvailability(dateStr, startHour, endHour)) return 'available';
    return 'closed';
  };

  const getPastorSlotLabel = (status: 'available' | 'blocked' | 'booked' | 'closed'): string => {
    if (status === 'available') return t('calendar.available');
    if (status === 'blocked') return t('calendar.unavailable');
    if (status === 'booked') return t('booking.booked');
    return t('calendar.noAvailabilityOpened');
  };

  const handleToggleSlotBlock = async (day: Date, startHour: number) => {
    const dateStr = getDateString(day);
    const endHour = startHour + SLOT_BLOCK_DURATION;

    if (isPastorSlotBooked(dateStr, startHour, endHour)) return;
    if (!isPastorSlotInsideAvailability(dateStr, startHour, endHour) && !getBlockingUnavailabilityForSlot(dateStr, startHour, endHour)) return;

    setSlotBlockingLoading(true);

    try {
      const { push, remove } = await import('firebase/database');
      const existingBlock = getBlockingUnavailabilityForSlot(dateStr, startHour, endHour);

      if (!existingBlock) {
        await push(ref(database, 'unavailability/'), {
          date: dateStr,
          startTime: hourToTime(startHour),
          endTime: hourToTime(endHour),
          reason: 'Slot blocked by pastor',
          allDay: false,
          updatedAt: Date.now(),
        });
        return;
      }

      const existingRange = getUnavailabilityRange(existingBlock);
      await remove(ref(database, `unavailability/${existingBlock.id}`));

      if (existingRange.start < startHour) {
        await push(ref(database, 'unavailability/'), {
          date: dateStr,
          startTime: hourToTime(existingRange.start),
          endTime: hourToTime(startHour),
          reason: existingBlock.reason || 'Slot blocked by pastor',
          allDay: false,
          updatedAt: Date.now(),
        });
      }

      if (endHour < existingRange.end) {
        await push(ref(database, 'unavailability/'), {
          date: dateStr,
          startTime: hourToTime(endHour),
          endTime: hourToTime(existingRange.end),
          reason: existingBlock.reason || 'Slot blocked by pastor',
          allDay: false,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error(err);
      alert(t('calendar.saveUnavailabilityFailed'));
    } finally {
      setSlotBlockingLoading(false);
    }
  };

  const slotBlockHours = Array.from(
    { length: Math.floor((SLOT_BLOCK_END - SLOT_BLOCK_START) / SLOT_BLOCK_DURATION) },
    (_, index) => SLOT_BLOCK_START + index * SLOT_BLOCK_DURATION
  );

  const selectedCount = selectedParticipants.length;
  const selectedNames = participants
    .filter(p => selectedParticipants.includes(p.id))
    .map(p => p.name);

  const availabilityDateCount = buildAvailabilityDates().length;

  return (
    <div className="space-y-8" style={{ fontFamily: 'Arial, sans-serif' }} dir={dir}>
      <PageTitle
        title={t('calendar.title')}
        subtitle={t('calendar.subtitle')}
        icon={<CalendarIcon size={22} />}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">{format(currentDate, 'MMMM yyyy')}</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            {t('calendar.availabilityOpensBooking')}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-stone-50 rounded-xl p-1 border border-gray-200">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={20} /></button>
          </div>
          {googleTokens ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 text-green-700 font-semibold bg-green-50 px-4 py-2 rounded-full border border-green-100 text-sm">
                <Video size={14} />
                {t('calendar.googleConnected')}
              </span>
              <button
                onClick={() => { clearTokens(); setGoogleTokens(null); }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title={t('calendar.disconnectGoogle')}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={startGoogleAuth}
              className="flex items-center gap-2 bg-[#8B1E1E] hover:bg-[#641414] text-white px-6 py-3 rounded-xl font-bold shadow transition-colors text-sm"
            >
              <Video size={16} />
              {t('calendar.connectGoogle')}
            </button>
          )}
          <button
            onClick={() => { setIsAddOpen(true); setEditingMeeting(null); setSelectedParticipants([]); setEmailSent(false); }}
            className="flex items-center gap-2 bg-[#8B1E1E] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#8B1E1E]/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            <span>{t('calendar.addEvent')}</span>
          </button>
          <button
            onClick={() => {
              setShowAvailabilityModal(true);
              setEditingAvailability(null);
              resetAvailabilityForm();
            }}
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-5 py-3 rounded-xl font-bold transition-colors text-sm border border-green-200"
          >
            <CheckCircle size={16} />
            <span>{t('calendar.markAvailable')}</span>
          </button>
          <button
            onClick={() => {
              setShowUnavailabilityModal(true);
              setEditingUnavailability(null);
              resetUnavailabilityForm();
            }}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-5 py-3 rounded-xl font-bold transition-colors text-sm border border-red-200"
          >
            <XCircle size={16} />
            <span>{t('calendar.markUnavailable')}</span>
          </button>
          <button
            onClick={() => {
              setShowAiAssistant(!showAiAssistant);
              if (!showAiAssistant && aiMessages.length === 0) {
                const pendingCount = meetingRequests.filter(r => r.status === 'pending').length;
                setAiMessages([
                  {
                    role: 'assistant',
                    content: `Hi Pastor! I'm your AI calendar assistant. You have ${pendingCount} pending request${pendingCount !== 1 ? 's' : ''}.\n\nI can help you:\n• Add availability\n• Add unavailability\n• Accept/reject meeting requests\n• View your schedule\n\nWhat would you like to do?`,
                    timestamp: new Date(),
                  },
                ]);
              }
            }}
            className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-5 py-3 rounded-xl font-bold transition-colors text-sm border border-purple-200"
          >
            <Bot size={16} />
            <span>{t('calendar.aiAssistant')}</span>
          </button>
        </div>
      </div>

      {meetingRequests.filter(r => r.status === 'pending').length > 0 && (
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-amber-700">
              <Hourglass size={18} />
              {t('requests.title')}
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {meetingRequests.filter(r => r.status === 'pending').length}
              </span>
            </h3>
            <button onClick={() => setShowRequests(!showRequests)} className="text-xs text-[#8B1E1E] font-bold hover:underline">
              {showRequests ? t('requests.hide') : t('requests.viewAll')}
            </button>
          </div>
          {showRequests && (
            <div className="space-y-3">
              {meetingRequests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-stone-50 rounded-xl border border-gray-100 gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100">
                      <User size={18} className="text-[#8B1E1E]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{req.name}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail size={11} /> {req.email}</span>
                        <span className="flex items-center gap-1"><CalendarIcon size={11} /> {req.date}</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {timeRangeToLabel(req.startTime, req.endTime, displayLocale)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 italic">{req.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button onClick={() => handleRequestStatus(req.id!, 'accepted')} className="flex items-center gap-1 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                      <CheckCircle size={14} />
                      {t('requests.accept')}
                    </button>
                    <button onClick={() => handleRequestStatus(req.id!, 'rejected')} className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                      <XCircle size={14} />
                      {t('requests.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map(d => (
          <div key={d} className="text-center text-[10px] uppercase tracking-widest text-gray-400 font-bold hidden md:block">{d}</div>
        ))}
        {days.map((day, i) => {
          const dayMeetings = meetings.filter(m => {
            if (!m.date) return false;
            try {
              return isSameDay(parseISO(m.date), day);
            } catch {
              return false;
            }
          });

          const dayAvailability = availability.filter(a => {
            if (!a.date) return false;
            try {
              return isSameDay(parseISO(a.date), day);
            } catch {
              return false;
            }
          });

          const dayUnavailability = unavailability.filter(u => {
            if (!u.date) return false;
            try {
              return isSameDay(parseISO(u.date), day);
            } catch {
              return false;
            }
          });

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedSlotDay(day)}
              className={`min-h-[140px] bg-white rounded-2xl p-3 border transition-all hover:border-[#8B1E1E]/20 cursor-pointer ${selectedSlotDay && isSameDay(selectedSlotDay, day) ? 'border-[#8B1E1E] ring-2 ring-[#8B1E1E]/10' : 'border-gray-100'} ${i === 0 ? [
                '',
                'md:col-start-1',
                'md:col-start-2',
                'md:col-start-3',
                'md:col-start-4',
                'md:col-start-5',
                'md:col-start-6',
                'md:col-start-7',
              ][day.getDay() + 1] : ''
                }`}
            >
              <div className="text-sm font-bold text-gray-900 mb-2">{format(day, 'd')}</div>
              <div className="space-y-2">
                {dayAvailability.length === 0 && (
                  <div className="p-2 bg-gray-50 rounded-lg text-[10px] border border-gray-100 text-gray-400 font-bold">
                    {t('calendar.noAvailabilityOpened')}
                  </div>
                )}

                {dayAvailability.map(a => (
                  <div
                    key={a.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAvailability(a);
                      setAvailabilityForm({
                        mode: 'single',
                        date: a.date,
                        startDate: a.date,
                        endDate: a.date,
                        selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
                        startTime: a.startTime || '09:00',
                        endTime: a.endTime || '20:00',
                        reason: a.reason || '',
                        allDay: a.allDay || false,
                      });
                      setShowAvailabilityModal(true);
                    }}
                    className="p-2 bg-green-50 rounded-lg text-[10px] cursor-pointer group hover:bg-green-100 transition-colors border border-green-200 relative"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAvailability(a.id);
                      }}
                      className="absolute top-1 right-1 p-0.5 text-green-500 hover:text-green-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                    <div className="font-bold text-green-700 line-clamp-1">{a.allDay ? t('calendar.available') : timeRangeToLabel(a.startTime, a.endTime, displayLocale)}</div>
                    {a.reason && <div className="text-green-600 text-[9px] mt-0.5 line-clamp-1">{a.reason}</div>}
                  </div>
                ))}

                {dayUnavailability.map(u => (
                  <div
                    key={u.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingUnavailability(u);
                      setUnavailabilityForm({
                        date: u.date,
                        startTime: u.startTime || '09:00',
                        endTime: u.endTime || '20:00',
                        reason: u.reason || '',
                        allDay: u.allDay || false,
                      });
                      setShowUnavailabilityModal(true);
                    }}
                    className="p-2 bg-red-50 rounded-lg text-[10px] cursor-pointer group hover:bg-red-100 transition-colors border border-red-200 relative"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUnavailability(u.id);
                      }}
                      className="absolute top-1 right-1 p-0.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                    <div className="font-bold text-red-700 line-clamp-1">{u.allDay ? t('calendar.unavailable') : timeRangeToLabel(u.startTime, u.endTime, displayLocale)}</div>
                    {u.reason && <div className="text-red-500 text-[9px] mt-0.5 line-clamp-1">{u.reason}</div>}
                  </div>
                ))}

                {dayMeetings.map(m => (
                  <div
                    key={m.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMeeting(m);
                      setNewMeeting(m);
                      setSelectedParticipants(m.participantIds || []);
                      setIsAddOpen(true);
                    }}
                    className="p-2 bg-stone-50 rounded-lg text-[10px] cursor-pointer group hover:bg-[#8B1E1E] transition-colors"
                  >
                    <div className="font-bold group-hover:text-white line-clamp-1">{getMeetingDisplayTitle(m)}</div>
                    <div className="text-gray-500 group-hover:text-white/80">{timeToLabel(m.startTime, displayLocale)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedSlotDay && (
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 text-[#8B1E1E]">
                <Clock size={18} />
                {format(selectedSlotDay, 'EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                {t('calendar.availabilityOpensBooking')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSlotDay(null)}
              className="self-start sm:self-auto p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {slotBlockHours.map(hour => {
              const status = getPastorSlotStatus(selectedSlotDay, hour);
              const isClickable = status === 'available' || status === 'blocked';
              const slotLabel = getPastorSlotLabel(status);

              return (
                <button
                  key={hour}
                  type="button"
                  disabled={!isClickable || slotBlockingLoading}
                  onClick={() => handleToggleSlotBlock(selectedSlotDay, hour)}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    status === 'blocked'
                      ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      : status === 'available'
                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                      : status === 'booked'
                      ? 'bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed opacity-80'
                      : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  <div>{hourToLabel(hour, displayLocale)} - {hourToLabel(hour + SLOT_BLOCK_DURATION, displayLocale)}</div>
                  <div className="text-[10px] mt-1 uppercase tracking-widest">{slotLabel}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#8B1E1E]">
          <Clock size={20} />
          {t('calendar.upcoming')}
        </h3>
        <div className="space-y-4">
          {meetings.filter(m => {
            if (!m.date) return false;
            try {
              return parseISO(m.date) >= new Date();
            } catch {
              return false;
            }
          }).map(m => {
            const meetingParticipants = (m.participantIds || []).map(id =>
              participants.find(p => p.id === id)
            ).filter(Boolean) as Participant[];

            const requestEmail = getMeetingRequestEmail(m);
            const requestReason = getMeetingRequestReason(m);

            return (
              <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-stone-50 rounded-2xl border border-gray-100 hover:border-[#8B1E1E]/20 transition-all gap-4">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400">{format(parseISO(m.date), 'MMM')}</span>
                    <span className="text-2xl font-bold text-[#8B1E1E] leading-none">{format(parseISO(m.date), 'dd')}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{getMeetingDisplayTitle(m)}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Clock size={12} /> {timeRangeToLabel(m.startTime, m.endTime, displayLocale)}</span>
                      {m.location && <span className="flex items-center gap-1"><MapPin size={12} /> {m.location}</span>}
                      {requestEmail && <span className="flex items-center gap-1"><Mail size={12} /> {requestEmail}</span>}
                      {meetingParticipants.length > 0 && (
                        <span className="flex items-center gap-1"><Users size={12} /> {meetingParticipants.map(p => p.name).join(', ')}</span>
                      )}
                    </div>
                    {requestReason && <p className="text-xs text-gray-400 mt-1 italic">{requestReason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto">
                  {m.meetLink && (
                    <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                      <Video size={18} />
                    </a>
                  )}
                  <button onClick={() => handleDelete(m.id!)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          {meetings.filter(m => {
            if (!m.date) return false;
            try { return parseISO(m.date) >= new Date(); } catch { return false; }
          }).length === 0 && (
            <div className="text-center py-12 text-gray-400 italic">{t('calendar.noUpcoming')}</div>
          )}
        </div>
      </section>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
              <h3 className="text-xl font-bold">{editingMeeting ? t('calendar.update') : t('calendar.create')}</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.titleField')}</label>
                <input required type="text" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={newMeeting.title} onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.dateField')}</label>
                  <input required type="date" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={newMeeting.date} onChange={e => setNewMeeting(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.typeField')}</label>
                  <select className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={newMeeting.type} onChange={e => setNewMeeting(p => ({ ...p, type: e.target.value as any }))}>
                    <option value="service">{t('calendar.service')}</option>
                    <option value="prayer">{t('calendar.prayer')}</option>
                    <option value="counseling">{t('calendar.counseling')}</option>
                    <option value="other">{t('calendar.other')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startTime')}</label>
                  <select required className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={newMeeting.startTime} onChange={e => setNewMeeting(p => ({ ...p, startTime: e.target.value }))}>
                    {MEETING_TIME_OPTIONS.map(option => (
                      <option key={`meeting-start-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                  <select required className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={newMeeting.endTime} onChange={e => setNewMeeting(p => ({ ...p, endTime: e.target.value }))}>
                    {MEETING_TIME_OPTIONS.map(option => (
                      <option key={`meeting-end-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {participants.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.participants')}</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowParticipantDropdown(!showParticipantDropdown)}
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl flex items-center justify-between text-left hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Users size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate text-sm">
                          {selectedCount === 0
                            ? t('calendar.selectParticipants')
                            : `${selectedCount} ${t('calendar.selected')}`
                          }
                        </span>
                      </div>
                      <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                    </button>

                    {showParticipantDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 border-b bg-stone-50 rounded-t-xl flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500 uppercase">{participants.length} {t('calendar.trainees')}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedParticipants(participants.map(p => p.id))}
                            className="text-[10px] text-[#8B1E1E] font-bold hover:underline"
                          >
                            {t('calendar.selectAll')}
                          </button>
                        </div>
                        {participants.map(p => (
                          <label
                            key={p.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedParticipants.includes(p.id)}
                              onChange={() => toggleParticipant(p.id)}
                              className="w-4 h-4 rounded border-gray-300 text-[#8B1E1E] focus:ring-[#8B1E1E]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate">{p.name}</div>
                              <div className="text-[10px] text-gray-400 truncate">{p.email}</div>
                            </div>
                            {p.primaryGift && (
                              <span className="text-[9px] bg-stone-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">{p.primaryGift}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCount > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedNames.map((name, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-[#f8eeee] text-[#8B1E1E] px-2 py-1 rounded-full">
                          {name}
                          <button type="button" onClick={() => toggleParticipant(selectedParticipants[i])} className="hover:text-red-500">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.meetLink')}</label>
                  <div className="flex gap-4">
                    {googleTokens ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const { meetLink } = await createCalendarMeetLink(googleTokens, newMeeting.title || t('calendar.meeting'), newMeeting.date || '', newMeeting.startTime || '', newMeeting.endTime || '');
                            setNewMeeting(p => ({ ...p, meetLink }));
                          } catch (err: any) {
                            alert(err.message || t('calendar.failedMeet'));
                            setGoogleTokens(null);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-green-600 hover:underline"
                        disabled={loading}
                      >
                        <Wand2 size={10} />
                        {t('calendar.createMeet')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startGoogleAuth}
                        className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:underline"
                      >
                        <Wand2 size={10} />
                        {t('calendar.authForMeet')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const link = generatePlaceholderLink();
                        setNewMeeting(p => ({ ...p, meetLink: link }));
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#8B1E1E] hover:underline"
                    >
                      <Wand2 size={10} />
                      {t('calendar.genFake')}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="url" placeholder="https://meet.google.com/..." className="w-full pl-12 pr-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={newMeeting.meetLink} onChange={e => setNewMeeting(p => ({ ...p, meetLink: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.location')}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" className="w-full pl-12 pr-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={newMeeting.location} onChange={e => setNewMeeting(p => ({ ...p, location: e.target.value }))} />
                </div>
              </div>

              {emailSent && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-100">
                  <Check size={16} />
                  <span className="text-sm font-bold">{t('calendar.meetingSaved')} ({selectedCount})!</span>
                </div>
              )}

              <button disabled={loading} type="submit" className="w-full py-4 bg-[#8B1E1E] text-white rounded-2xl font-bold shadow-xl shadow-[#8B1E1E]/10 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>{t('calendar.saving')}</>
                ) : (
                  <>
                    <Send size={16} />
                    {editingMeeting ? t('calendar.update') : t('calendar.create')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-green-700">{editingAvailability ? t('calendar.editAvailability') : t('calendar.markAvailable')}</h3>
                <p className="text-xs text-gray-400 mt-1">{t('calendar.availabilityDatabaseNote')}</p>
              </div>
              <button onClick={() => { setShowAvailabilityModal(false); setEditingAvailability(null); resetAvailabilityForm(); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAvailability} className="p-6 space-y-4">
              {!editingAvailability && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAvailabilityForm(p => ({ ...p, mode: 'single' }))}
                    className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                      availabilityForm.mode === 'single'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {t('calendar.singleDay')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailabilityForm(p => ({ ...p, mode: 'multiple' }))}
                    className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                      availabilityForm.mode === 'multiple'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {t('calendar.multipleDays')}
                  </button>
                </div>
              )}

              {(availabilityForm.mode === 'single' || editingAvailability) && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.dateField')}</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                    value={availabilityForm.date}
                    onChange={e => setAvailabilityForm(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
              )}

              {availabilityForm.mode === 'multiple' && !editingAvailability && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startDate')}</label>
                      <input
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                        value={availabilityForm.startDate}
                        onChange={e => setAvailabilityForm(p => ({ ...p, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endDate')}</label>
                      <input
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                        value={availabilityForm.endDate}
                        onChange={e => setAvailabilityForm(p => ({ ...p, endDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.daysIncluded')}</label>
                    <div className="grid grid-cols-7 gap-2">
                      {[
                        { day: 0, label: t('calendar.sun') },
                        { day: 1, label: t('calendar.mon') },
                        { day: 2, label: t('calendar.tue') },
                        { day: 3, label: t('calendar.wed') },
                        { day: 4, label: t('calendar.thu') },
                        { day: 5, label: t('calendar.fri') },
                        { day: 6, label: t('calendar.sat') },
                      ].map(item => (
                        <button
                          key={item.day}
                          type="button"
                          onClick={() => toggleAvailabilityWeekday(item.day)}
                          className={`py-2 rounded-lg text-[10px] font-bold border transition-colors ${
                            availabilityForm.selectedWeekdays.includes(item.day)
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      {t('calendar.selectedDatesToCreate')}: {availabilityDateCount}
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allDayAvailability"
                  checked={availabilityForm.allDay}
                  onChange={e => setAvailabilityForm(p => ({ ...p, allDay: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="allDayAvailability" className="text-sm font-bold text-gray-700">{t('calendar.allBookableHours')}</label>
              </div>

              {!availabilityForm.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                      value={availabilityForm.startTime}
                      onChange={e => setAvailabilityForm(p => ({ ...p, startTime: e.target.value }))}
                    >
                      {BOOKING_WINDOW_TIME_OPTIONS.map(option => (
                        <option key={`availability-start-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                      value={availabilityForm.endTime}
                      onChange={e => setAvailabilityForm(p => ({ ...p, endTime: e.target.value }))}
                    >
                      {BOOKING_WINDOW_TIME_OPTIONS.map(option => (
                        <option key={`availability-end-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.reasonLabelOptional')}</label>
                <input
                  type="text"
                  placeholder={t('calendar.availabilityPlaceholder')}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                  value={availabilityForm.reason}
                  onChange={e => setAvailabilityForm(p => ({ ...p, reason: e.target.value }))}
                />
              </div>

              <button disabled={loading} type="submit" className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-600/10 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>{t('calendar.savingPlain')}</>
                ) : (
                  <>
                    <Send size={16} />
                    {editingAvailability ? t('calendar.updateAvailability') : availabilityForm.mode === 'multiple' ? `${t('calendar.markDaysAvailable')} (${availabilityDateCount})` : t('calendar.markDayAvailable')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showUnavailabilityModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-red-700">{editingUnavailability ? t('calendar.editUnavailability') : t('calendar.markUnavailable')}</h3>
                <p className="text-xs text-gray-400 mt-1">{t('calendar.unavailabilityDatabaseNote')}</p>
              </div>
              <button onClick={() => { setShowUnavailabilityModal(false); setEditingUnavailability(null); resetUnavailabilityForm(); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUnavailability} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.dateField')}</label>
                <input
                  required
                  type="date"
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                  value={unavailabilityForm.date}
                  onChange={e => setUnavailabilityForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allDayUnavailability"
                  checked={unavailabilityForm.allDay}
                  onChange={e => setUnavailabilityForm(p => ({ ...p, allDay: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="allDayUnavailability" className="text-sm font-bold text-gray-700">{t('calendar.allDay')}</label>
              </div>

              {!unavailabilityForm.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                      value={unavailabilityForm.startTime}
                      onChange={e => setUnavailabilityForm(p => ({ ...p, startTime: e.target.value }))}
                    >
                      {FULL_DAY_TIME_OPTIONS.map(option => (
                        <option key={`unavailability-start-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                      value={unavailabilityForm.endTime}
                      onChange={e => setUnavailabilityForm(p => ({ ...p, endTime: e.target.value }))}
                    >
                      {FULL_DAY_TIME_OPTIONS.map(option => (
                        <option key={`unavailability-end-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.reasonOptional')}</label>
                <input
                  type="text"
                  placeholder={t('calendar.unavailabilityPlaceholder')}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                  value={unavailabilityForm.reason}
                  onChange={e => setUnavailabilityForm(p => ({ ...p, reason: e.target.value }))}
                />
              </div>

              <button disabled={loading} type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-600/10 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>{t('calendar.savingPlain')}</>
                ) : (
                  <>
                    <Send size={16} />
                    {editingUnavailability ? t('calendar.updateUnavailability') : t('calendar.markUnavailable')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showAiAssistant && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t('calendar.pastorAiAssistant')}</h3>
                  <p className="text-xs text-white/80">{t('calendar.manageCalendarNaturalLanguage')}</p>
                </div>
              </div>
              <button onClick={() => setShowAiAssistant(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1">
                        <Bot size={12} className="text-purple-500" />
                        <span className="text-xs font-bold text-purple-600">{t('calendar.aiAssistant')}</span>
                      </div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                      {format(msg.timestamp, 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 rounded-bl-sm">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-600"></div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-white">
              <form onSubmit={handleAiAssistant} className="flex gap-3">
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="e.g., 'I'm available next Friday' or 'block Friday afternoon'"
                  className="flex-1 px-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  disabled={aiLoading}
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiInput.trim()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
