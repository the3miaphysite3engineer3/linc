import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  dangerouslyAllowBrowser: true,
});

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

type ORChatMessage = {
  role: string;
  content: string;
  reasoning_details?: unknown;
};

async function callOpenRouter(messages: ORChatMessage[], systemPrompt: string): Promise<string> {
  const systemMessage: ORChatMessage = { role: 'system', content: systemPrompt };

  const apiResponse = await client.chat.completions.create({
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    messages: [systemMessage, ...messages] as any,
    reasoning: { enabled: true },
  } as any);

  const response = apiResponse.choices[0].message as ORChatMessage & { content: string };
  return response.content || '';
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

Find the best available slot. Return ONLY valid JSON.`;

  const text = await callOpenRouter([{ role: 'user', content: userPrompt }], systemPrompt);
  
  try {
    return JSON.parse(text) as AISuggestion;
  } catch {
    return { suggestedDate: '', suggestedStartTime: '', suggestedEndTime: '', reason: 'Could not find available slot' };
  }
}

export async function summarizeSchedule(
  context: CalendarContext,
  dateRange: { start: string; end: string }
): Promise<string> {
  const systemPrompt = 'You are a helpful assistant that summarizes calendar schedules for church pastors. Be concise and clear.';
  
  const userPrompt = `Summarize the pastor's schedule from ${dateRange.start} to ${dateRange.end}. List all meetings and any unavailability. Highlight any conflicts or busy periods.

Meetings: ${JSON.stringify(context.meetings, null, 2)}
Unavailability: ${JSON.stringify(context.unavailability, null, 2)}`;

  return await callOpenRouter([{ role: 'user', content: userPrompt }], systemPrompt) || 'No schedule summary available.';
}

export async function checkConflict(
  context: CalendarContext,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ hasConflict: boolean; conflictDetails?: string }> {
  const systemPrompt = 'You are a calendar conflict checker. Return a JSON object with: hasConflict (boolean), conflictDetails (string, only if there\'s a conflict).';
  
  const userPrompt = `Check if there's a conflict for a meeting on ${date} from ${startTime || '00:00'} to ${endTime || '23:59'}.

Current schedule:
Meetings: ${JSON.stringify(context.meetings, null, 2)}
Unavailability: ${JSON.stringify(context.unavailability.map(u => ({
  ...u,
  startTime: u.startTime || '00:00',
  endTime: u.endTime || '23:59',
  allDay: u.allDay || false,
})), null, 2)}

Return ONLY valid JSON.`;

  const text = await callOpenRouter([{ role: 'user', content: userPrompt }], systemPrompt);
  
  try {
    return JSON.parse(text) as { hasConflict: boolean; conflictDetails?: string };
  } catch {
    return { hasConflict: false };
  }
}
