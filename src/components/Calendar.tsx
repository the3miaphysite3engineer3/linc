import React, { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';
import type { Meeting, MeetingRequest } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { Plus, Trash2, Video, MapPin, Clock, X, ChevronLeft, ChevronRight, Wand2, LogOut, Send, Users, Check, ChevronDown, Calendar as CalendarIcon, CheckCircle, XCircle, Hourglass, Mail, User } from 'lucide-react';
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
import BookMeeting from './BookMeeting';

interface Participant {
  id: string;
  name: string;
  email: string;
  primaryGift: string;
}

export default function Calendar() {
  const { t, dir } = useI18n();
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
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

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

  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    location: '',
    meetLink: '',
    type: 'service'
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

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
            <p style="margin: 4px 0; font-size: 14px;"><strong>Time:</strong> ${meetingData.startTime} - ${meetingData.endTime}</p>
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
        type: 'service'
      });
    } catch (err) {
      console.error(err);
      alert(t('calendar.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this meeting?')) {
      try {
        const { remove } = await import('firebase/database');
        await remove(ref(database, `meetings/${id}`));
      } catch (err) {
        console.error(err);
      }
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
              const created = await createCalendarMeetLink(googleTokens, `Meeting with ${req.name}`, req.date, req.startTime, req.endTime);
              meetLink = created.meetLink;
            } catch (err) {
              console.error('Failed to create real Meet link, using placeholder:', err);
            }
          }

          const { push } = await import('firebase/database');
          await push(ref(database, 'meetings/'), {
            title: `Meeting with ${req.name}`,
            date: req.date,
            startTime: req.startTime,
            endTime: req.endTime,
            location: '',
            meetLink,
            type: 'counseling',
            participantIds: [],
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
                    <p style="margin:4px 0;font-size:14px;"><strong>Meeting:</strong> Meeting with Pastor</p>
                    <p style="margin:4px 0;font-size:14px;"><strong>Date:</strong> ${format(parseISO(req.date), 'EEEE, MMMM d, yyyy')}</p>
                    <p style="margin:4px 0;font-size:14px;"><strong>Time:</strong> ${req.startTime} - ${req.endTime}</p>
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

  const selectedCount = selectedParticipants.length;
  const selectedNames = participants
    .filter(p => selectedParticipants.includes(p.id))
    .map(p => p.name);

  return (
    <div className="space-y-8" style={{ fontFamily: 'Arial, sans-serif' }} dir={dir}>
      <PageTitle
        title={t('calendar.title')}
        subtitle={t('calendar.subtitle')}
        icon={<CalendarIcon size={22} />}
      />

      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">{format(currentDate, 'MMMM yyyy')}</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">{t('calendar.schedule')}</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-[#8B1E1E] px-5 py-3 rounded-xl font-bold transition-colors text-sm"
          >
            <CalendarIcon size={16} />
            {t('booking.bookBtn')}
          </button>
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
        </div>
      </div>

      {/* Meeting Requests Section */}
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
                        <span className="flex items-center gap-1"><Clock size={11} /> {req.startTime} - {req.endTime}</span>
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

      {/* Calendar Grid */}
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
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[140px] bg-white rounded-2xl p-3 border border-gray-100 transition-all hover:border-[#8B1E1E]/20 ${i === 0 ? [
                  '',
                  'md:col-start-1',
                  'md:col-start-2',
                  'md:col-start-3',
                  'md:col-start-4',
                  'md:col-start-5',
                  'md:col-start-6',
                  'md:col-start-7'
                ][day.getDay() + 1] : ''
                }`}
            >
              <div className="text-sm font-bold text-gray-900 mb-2">{format(day, 'd')}</div>
              <div className="space-y-2">
                {dayMeetings.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setEditingMeeting(m);
                      setNewMeeting(m);
                      setSelectedParticipants(m.participantIds || []);
                      setIsAddOpen(true);
                    }}
                    className="p-2 bg-stone-50 rounded-lg text-[10px] cursor-pointer group hover:bg-[#8B1E1E] transition-colors"
                  >
                    <div className="font-bold group-hover:text-white line-clamp-1">{m.title}</div>
                    <div className="text-gray-500 group-hover:text-white/80">{m.startTime}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming Meetings List */}
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
            return (
              <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-stone-50 rounded-2xl border border-gray-100 hover:border-[#8B1E1E]/20 transition-all gap-4">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400">{format(parseISO(m.date), 'MMM')}</span>
                    <span className="text-2xl font-bold text-[#8B1E1E] leading-none">{format(parseISO(m.date), 'dd')}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{m.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Clock size={12} /> {m.startTime} - {m.endTime}</span>
                      {m.location && <span className="flex items-center gap-1"><MapPin size={12} /> {m.location}</span>}
                      {meetingParticipants.length > 0 && (
                        <span className="flex items-center gap-1"><Users size={12} /> {meetingParticipants.map(p => p.name).join(', ')}</span>
                      )}
                    </div>
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

      {/* Add/Edit Modal */}
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
                  <input required type="time" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={newMeeting.startTime} onChange={e => setNewMeeting(p => ({ ...p, startTime: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                  <input required type="time" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none" value={newMeeting.endTime} onChange={e => setNewMeeting(p => ({ ...p, endTime: e.target.value }))} />
                </div>
              </div>

              {/* Participants Dropdown */}
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
                            Select All
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

              {/* Google Meet */}
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
                            const { meetLink } = await createCalendarMeetLink(googleTokens, newMeeting.title || 'Meeting', newMeeting.date || '', newMeeting.startTime || '', newMeeting.endTime || '');
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

              {/* Location */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location (Optional)</label>
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

      <BookMeeting isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} />
    </div>
  );
}
