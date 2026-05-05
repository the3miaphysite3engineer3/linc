import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Send, Sparkles, Bot, User } from 'lucide-react';
import { format } from 'date-fns';
import { database } from '../firebase';
import { ref, push, onValue } from 'firebase/database';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface BookingFormData {
  name: string;
  email: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface Meeting {
  id?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface Unavailability {
  id?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
}

export default function AIBookingAssistant({ isOpen, onClose, preSelectedDate }: { isOpen: boolean; onClose: () => void; preSelectedDate?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'name' | 'email' | 'date' | 'time' | 'reason' | 'confirm' | 'done'>('name');
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    date: preSelectedDate || format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    reason: '',
  });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const meetingsRef = ref(database, 'meetings/');
    const unsubscribe = onValue(meetingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: Meeting[] = Object.values(data).map((val: any) => ({
          title: val.title || '',
          date: val.date,
          startTime: val.startTime,
          endTime: val.endTime,
        }));
        setMeetings(parsed);
      } else {
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
        const parsed: Unavailability[] = Object.values(data).map((val: any) => ({
          date: val.date,
          startTime: val.startTime,
          endTime: val.endTime,
          allDay: val.allDay || false,
        }));
        setUnavailability(parsed);
      } else {
        setUnavailability([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Hi! I'm the LINC Church booking assistant. I can help you schedule a meeting with our pastor. Let's start - what's your name?`,
          timestamp: new Date(),
        },
      ]);
      setStep('name');
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && step !== 'done') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, step]);

  const checkTimeConflict = (date: string, startTime: string, endTime: string): boolean => {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    
    const hasMeetingConflict = meetings.some(m => {
      if (m.date !== date) return false;
      return toMin(startTime) < toMin(m.endTime) && toMin(m.startTime) < toMin(endTime);
    });

    const hasUnavailabilityConflict = unavailability.some(u => {
      if (u.date !== date) return false;
      if (u.allDay) return true;
      const uStart = u.startTime || '00:00';
      const uEnd = u.endTime || '23:59';
      return toMin(startTime) < toMin(uEnd) && toMin(uStart) < toMin(endTime);
    });

    return hasMeetingConflict || hasUnavailabilityConflict;
  };

  const findAvailableSlots = async (date: string): Promise<string[]> => {
    const slots: string[] = [];
    const businessHours = [8, 9, 10, 11, 13, 14, 15, 16, 17];
    
    for (const hour of businessHours) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      if (!checkTimeConflict(date, startTime, endTime)) {
        slots.push(`${startTime} - ${endTime}`);
      }
    }
    
    return slots;
  };

  const getAIResponse = async (userMessage: string): Promise<string> => {
    if (!OPENROUTER_API_KEY) {
      return getDefaultResponse(userMessage);
    }

    const availableSlots = await findAvailableSlots(formData.date);

    const systemPrompt = `You are a helpful church booking assistant for LINC Church. Help users book meetings with the pastor conversationally.

Current booking step: ${step}
Current form data: ${JSON.stringify(formData)}

Available slots on ${formData.date}: ${JSON.stringify(availableSlots)}

Be friendly, concise, and helpful. Guide users through the booking process naturally. If they want to change something, help them. If there's a conflict, suggest alternatives.

Keep responses under 3 sentences when possible. Use simple, warm language.`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('OpenRouter API call failed');
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || getDefaultResponse(userMessage);
    } catch (err) {
      console.error('AI response failed:', err);
      return getDefaultResponse(userMessage);
    }
  };

  const getDefaultResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    
    switch (step) {
      case 'name':
        if (userMessage.length > 1) {
          setFormData(prev => ({ ...prev, name: userMessage }));
          setStep('email');
          return `Nice to meet you, ${userMessage}! What's your email address?`;
        }
        return "Could you please tell me your name?";
      
      case 'email':
        if (userMessage.includes('@') && userMessage.includes('.')) {
          setFormData(prev => ({ ...prev, email: userMessage }));
          setStep('date');
          return `Great! When would you like to meet? You can say something like "next Monday" or give me a specific date (YYYY-MM-DD).`;
        }
        return "That doesn't look like a valid email. Please try again.";
      
      case 'date':
        const dateMatch = userMessage.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const selectedDate = dateMatch[1];
          if (new Date(selectedDate) >= new Date(format(new Date(), 'yyyy-MM-dd'))) {
            setFormData(prev => ({ ...prev, date: selectedDate }));
            setStep('time');
            return `Perfect! ${selectedDate} works. What time would you prefer? You can say something like "10am" or "2pm".`;
          }
          return "That date is in the past. Please choose a future date.";
        }
        return "I couldn't understand the date. Please provide it in YYYY-MM-DD format (e.g., 2025-01-15).";
      
      case 'time':
        const timeMatch = userMessage.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = timeMatch[2] || '00';
          const period = timeMatch[3].toLowerCase();
          
          if (period === 'pm' && hour !== 12) hour += 12;
          if (period === 'am' && hour === 12) hour = 0;
          
          const startTime = `${hour.toString().padStart(2, '0')}:${minute}`;
          const endTimeHour = hour + 1;
          const endTime = `${endTimeHour.toString().padStart(2, '0')}:${minute}`;
          
          if (checkTimeConflict(formData.date, startTime, endTime)) {
            return `Sorry, that time is already booked. Please choose another time.`;
          }
          
          setFormData(prev => ({ ...prev, startTime, endTime }));
          setStep('reason');
          return `Great! ${startTime} - ${endTime} is available. What's the reason for your meeting? (e.g., counseling, prayer, general discussion)`;
        }
        return "I couldn't understand the time. Please say something like '10am' or '2pm'.";
      
      case 'reason':
        setFormData(prev => ({ ...prev, reason: userMessage }));
        setStep('confirm');
        return `Thanks! Here's your booking summary:\n\n📅 Date: ${formData.date}\n⏰ Time: ${formData.startTime} - ${formData.endTime}\n💬 Reason: ${userMessage}\n\nShall I submit this request? Say "yes" to confirm or "no" to start over.`;
      
      case 'confirm':
        if (lower.includes('yes') || lower.includes('confirm') || lower.includes('sure')) {
          setStep('done');
          return `🎉 Booking request submitted successfully! The pastor will review and confirm your meeting. You'll receive an email notification once it's approved.`;
        } else if (lower.includes('no') || lower.includes('cancel') || lower.includes('start over')) {
          setFormData({
            name: '',
            email: '',
            date: preSelectedDate || format(new Date(), 'yyyy-MM-dd'),
            startTime: '10:00',
            endTime: '11:00',
            reason: '',
          });
          setStep('name');
          setMessages([{
            role: 'assistant',
            content: "No problem! Let's start over. What's your name?",
            timestamp: new Date(),
          }]);
          return '';
        }
        return "Please say 'yes' to confirm or 'no' to start over.";
      
      default:
        return "I'm here to help you book a meeting. Please tell me what you need.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }]);

    setIsLoading(true);

    try {
      const response = await getAIResponse(userMessage);
      
      if (response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        }]);
      }

      if (step === 'done') {
        await submitBooking();
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const submitBooking = async () => {
    try {
      const request = {
        name: formData.name,
        email: formData.email,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        reason: formData.reason,
        status: 'pending',
        createdAt: Date.now(),
      };
      
      await push(ref(database, 'meetingRequests/'), request);
      
      const adminsRef = ref(database, 'admins/');
      const adminsSnapshot = await new Promise<any>((resolve) => {
        onValue(adminsRef, (snapshot) => resolve(snapshot.val()), { onlyOnce: true });
      });
      
      if (adminsSnapshot) {
        const pastorEmails: string[] = [];
        Object.keys(adminsSnapshot).forEach(k => {
          const email = k.replace(/,/g, '.').toLowerCase().trim();
          pastorEmails.push(email);
        });

        for (const pastorEmail of pastorEmails) {
          try {
            const emailjs = await import('@emailjs/browser');
            await emailjs.send(
              'service_v47g6or',
              'template_a0iy1xy',
              {
                to_email: pastorEmail,
                subject: `New Meeting Request from ${formData.name}`,
                fullReport: `A new meeting request has been submitted:\n\nName: ${formData.name}\nEmail: ${formData.email}\nDate: ${formData.date}\nTime: ${formData.startTime} - ${formData.endTime}\nReason: ${formData.reason}\n\nPlease log in to the dashboard to accept or reject this request.`,
              },
              'x_Xx3UHe3-yE1I13_'
            );
          } catch (err) {
            console.error(`Failed to notify pastor ${pastorEmail}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to submit booking:', err);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setMessages([]);
      setStep('name');
      setFormData({
        name: '',
        email: '',
        date: preSelectedDate || format(new Date(), 'yyyy-MM-dd'),
        startTime: '10:00',
        endTime: '11:00',
        reason: '',
      });
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={handleClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">AI Booking Assistant</h3>
              <p className="text-xs text-white/80">Chat to schedule your meeting</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={12} className="text-purple-500" />
                    <span className="text-xs font-bold text-purple-600">AI Assistant</span>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="flex items-center gap-2 mb-1">
                    <User size={12} />
                    <span className="text-xs font-bold text-purple-200">You</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                  {format(msg.timestamp, 'h:mm a')}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 rounded-bl-sm">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-600"></div>
                  <span className="text-sm text-gray-500">AI is typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {step !== 'done' && (
          <div className="p-4 border-t bg-white">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  step === 'name' ? 'Type your name...' :
                  step === 'email' ? 'Type your email...' :
                  step === 'date' ? 'Type date (YYYY-MM-DD)...' :
                  step === 'time' ? 'Type time (e.g., 10am)...' :
                  step === 'reason' ? 'Type meeting reason...' :
                  'Type yes or no...'
                }
                className="flex-1 px-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className="p-6 border-t bg-white text-center">
            <button
              onClick={handleClose}
              className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
