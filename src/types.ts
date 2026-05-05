export const GiftKeys = ['A', 'B', 'C', 'D', 'E'] as const;
export type GiftKey = typeof GiftKeys[number];

export interface GiftResult {
  primary: string;
  secondary: string;
  summary: string;
}

export interface Assessment {
  id?: string;
  fullName: string;
  email: string;
  surveyDate: string;
  age: number;
  attendance: string;
  currentService?: string;
  workContext?: string;
  languages: {
    arabic: string;
    english: string;
    other?: string;
  };
  faithJourney: Record<string, string>;
  giftScores: Record<string, number>;
  ministryScores: Record<string, number>;
  visionAnswers: Record<string, string>;
  results: GiftResult;
  createdAt: number;
}

export interface Meeting {
  id?: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetLink?: string;
  type: 'prayer' | 'counseling' | 'service' | 'other';
  participantIds?: string[];
  updatedAt: number;
}

export type Language = 'English' | 'Arabic';
