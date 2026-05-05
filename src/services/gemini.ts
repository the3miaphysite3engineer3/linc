import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export interface CalendarContext {
  meetings: Array<{
    title: string;
    date: string;
    startTime: string;
    endTime: string;
  }>;
  unavailability: Array<{
    date: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
  }>;
}

export interface AISuggestion {
  suggestedDate: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  reason: string;
}

export async function findAvailableSlot(
  context: CalendarContext,
  durationMinutes: number = 60,
  preferredDate?: string,
  preferredTime?: string
): Promise<AISuggestion> {
  const systemPrompt = `You are a calendar assistant for a church pastor. Given the current schedule, find the best available time slot for a new meeting.

Rules:
- Meetings should be during business hours (8:00 AM - 6:00 PM)
- Avoid conflicts with existing meetings and unavailability
- If a preferred date/time is given, try to find a slot close to it
- If no preference, find the earliest available slot within the next 7 days
- Return your answer as a JSON object with: suggestedDate (YYYY-MM-DD), suggestedStartTime (HH:MM), suggestedEndTime (HH:MM), reason (string explaining why this slot was chosen)`;

  const userPrompt = `Current schedule:
Meetings: ${JSON.stringify(context.meetings, null, 2)}
Unavailability: ${JSON.stringify(context.unavailability.map(u => ({
  ...u,
  startTime: u.startTime || '00:00',
  endTime: u.endTime || '23:59',
  allDay: u.allDay || false,
})), null, 2)}

Requested duration: ${durationMinutes} minutes
${preferredDate ? `Preferred date: ${preferredDate}` : ''}
${preferredTime ? `Preferred time: ${preferredTime}` : ''}

Find the best available slot.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedDate: { type: Type.STRING },
          suggestedStartTime: { type: Type.STRING },
          suggestedEndTime: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ["suggestedDate", "suggestedStartTime", "suggestedEndTime", "reason"],
      },
    },
  });

  return JSON.parse(response.text || '{}') as AISuggestion;
}

export async function summarizeSchedule(
  context: CalendarContext,
  dateRange: { start: string; end: string }
): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: `Summarize the pastor's schedule from ${dateRange.start} to ${dateRange.end}. List all meetings and any unavailability. Highlight any conflicts or busy periods.

Meetings: ${JSON.stringify(context.meetings, null, 2)}
Unavailability: ${JSON.stringify(context.unavailability, null, 2)}` }] }],
    config: {
      systemInstruction: "You are a helpful assistant that summarizes calendar schedules for church pastors. Be concise and clear.",
    },
  });

  return response.text || 'No schedule summary available.';
}

export async function checkConflict(
  context: CalendarContext,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ hasConflict: boolean; conflictDetails?: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: `Check if there's a conflict for a meeting on ${date} from ${startTime || '00:00'} to ${endTime || '23:59'}.

Current schedule:
Meetings: ${JSON.stringify(context.meetings, null, 2)}
Unavailability: ${JSON.stringify(context.unavailability.map(u => ({
  ...u,
  startTime: u.startTime || '00:00',
  endTime: u.endTime || '23:59',
  allDay: u.allDay || false,
})), null, 2)}` }] }],
    config: {
      systemInstruction: "You are a calendar conflict checker. Return a JSON object with: hasConflict (boolean), conflictDetails (string, only if there's a conflict).",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasConflict: { type: Type.BOOLEAN },
          conflictDetails: { type: Type.STRING },
        },
        required: ["hasConflict"],
      },
    },
  });

  return JSON.parse(response.text || '{}') as { hasConflict: boolean; conflictDetails?: string };
}
