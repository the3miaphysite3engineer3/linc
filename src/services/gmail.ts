export interface GmailTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
  storedAt?: number;
}

export function handleOAuthCallback(): GmailTokens | null {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token')) return null;
  const params = new URLSearchParams(hash.substring(1));
  const tokens: GmailTokens = {
    access_token: params.get('access_token') || '',
    token_type: params.get('token_type') || 'Bearer',
    expires_in: parseInt(params.get('expires_in') || '3600'),
    scope: params.get('scope') || '',
    error: params.get('error') || undefined,
  };
  window.history.replaceState({}, document.title, window.location.pathname);
  return tokens;
}

export function startGoogleAuth(): void {
  const GOOGLE_CLIENT_ID = '403483609083-df2l9cnkngulk7guunp42p84cc9c2pm5.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: window.location.origin,
    response_type: 'token',
    scope: SCOPES,
    prompt: 'consent',
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function getStoredTokens(): GmailTokens | null {
  const saved = localStorage.getItem('google_tokens');
  if (!saved) return null;
  try {
    const tokens = JSON.parse(saved);
    const storedAt = tokens.storedAt || 0;
    if (Date.now() - storedAt > (tokens.expires_in * 1000) - 60000) {
      localStorage.removeItem('google_tokens');
      return null;
    }
    return tokens;
  } catch {
    return null;
  }
}

export function storeTokens(tokens: GmailTokens): void {
  localStorage.setItem('google_tokens', JSON.stringify({ ...tokens, storedAt: Date.now() }));
}

export function clearTokens(): void {
  localStorage.removeItem('google_tokens');
}

function b64EncodeUnicode(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendGmailEmail(
  tokens: GmailTokens,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const fromEmail = 'me';
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    htmlBody,
  ].join('\r\n');

  const encodedMessage = b64EncodeUnicode(message);

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${fromEmail}/messages/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (response.status === 401) {
    clearTokens();
    throw new Error('Session expired. Please reconnect Google.');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to send email');
  }
}

export async function createCalendarMeetLink(
  tokens: GmailTokens,
  title: string,
  date: string,
  startTime: string,
  endTime?: string
): Promise<{ meetLink: string; eventId: string }> {
  const start = new Date(`${date}T${startTime}:00`);
  const end = endTime ? new Date(`${date}T${endTime}:00`) : new Date(start.getTime() + 60 * 60 * 1000);

  const event = {
    summary: title || 'Church Meeting',
    description: 'Created via LINC Pastor Dashboard',
    start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    conferenceData: {
      createRequest: { requestId: Math.random().toString(36).substring(2, 15), conferenceSolutionKey: { type: 'hangoutsMeet' } },
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });

  if (response.status === 401) {
    clearTokens();
    throw new Error('Session expired. Please reconnect Google Calendar.');
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create Google Meet link');
  }

  const data = await response.json();
  return { meetLink: data.hangoutLink, eventId: data.id };
}

export function generatePlaceholderLink(): string {
  const p1 = Math.random().toString(36).substring(2, 5);
  const p2 = Math.random().toString(36).substring(2, 6);
  const p3 = Math.random().toString(36).substring(2, 5);
  return `https://meet.google.com/${p1}-${p2}-${p3}`;
}

export const EMAILJS_SERVICE_ID = 'service_v47g6or';
export const EMAILJS_TEMPLATE_ID = 'template_a0iy1xy';
export const EMAILJS_PUBLIC_KEY = 'x_Xx3UHe3-yE1I13_';

export async function sendEmailViaEmailJS(
  to: string,
  subject: string,
  htmlBody: string,
  params: Record<string, string> = {}
): Promise<void> {
  const emailjs = await import('@emailjs/browser');
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email: to,
      subject,
      message: htmlBody,
      ...params,
    },
    EMAILJS_PUBLIC_KEY
  );
}
