import Constants from 'expo-constants';
import { Platform } from 'react-native';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:8000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://127.0.0.1:8000';
}

const DEVICE_ID = 'demo-device';

const RANDOM_ALARM_TIMEZONES = [
  'America/New_York',
  'America/Los_Angeles',
  'Pacific/Honolulu',
  'Pacific/Niue',
  'Pacific/Kiritimati',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kathmandu',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function chooseAlarmTimezone(localTimezone: string): string {
  if (Math.random() < 0.05) return localTimezone;
  const alternatives = RANDOM_ALARM_TIMEZONES.filter((timezone) => timezone !== localTimezone);
  return alternatives[Math.floor(Math.random() * alternatives.length)] ?? localTimezone;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const detail = typeof errBody.detail === 'string' ? errBody.detail : `Request failed (${res.status})`;
    throw new Error(detail);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export type BackendAlarm = {
  id: string;
  device_id: string;
  label: string;
  target_time: string;
  repeat_days: number[];
  one_time_date: string | null;
  sound: string;
  snooze_enabled: boolean;
  snooze_minutes: number;
  is_enabled: boolean;
  display_timezone: string;
  timezone_mode: string;
  next_trigger_utc: string | null;
};

export type AlarmListResponse = {
  alarms: BackendAlarm[];
  enabled_count: number;
  disabled_count: number;
  next_up: BackendAlarm | null;
};

export type EditSessionResponse = {
  session_id: string;
  expires_at: string;
  duration_seconds: number;
};

export type CaptchaChallenge = {
  challenge_id: string;
  target_digit: number;
  grid: number[];
};

export type SudokuChallenge = {
  challenge_id: string;
  puzzle: (number | null)[][];
  total_cells: number;
  filled_cells: number;
};

export type VerifyResponse = {
  passed: boolean;
  message: string;
  verification_token: string | null;
};

export type CheckinQuestionResponse = {
  checkin_id: string;
  question: string;
  push_sent: boolean;
};

export type CheckinReplyResponse = {
  innocent_reply: string;
  secret_timezone: string;
  evil_reasoning: string;
  alarms_hijacked: number;
};

export type RevealResponse = {
  alarm_id: string;
  effective_timezone: string;
  utc_offset: string;
};

export const api = {
  startSession: () =>
    request<EditSessionResponse>(`/alarms/session?device_id=${DEVICE_ID}`, { method: 'POST' }),

  listAlarms: () =>
    request<AlarmListResponse>(`/alarms?device_id=${DEVICE_ID}`),

  createAlarm: (sessionId: string, targetTime: string, homeTimezone: string, selectedTimezone: string) =>
    request<BackendAlarm>('/alarms', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        device_id: DEVICE_ID,
        label: 'Wake up',
        target_time: targetTime,
        repeat_days: [],
        sound: 'Slow sunrise',
        snooze_enabled: true,
        snooze_minutes: 9,
        home_timezone: homeTimezone,
        timezone_mode: 'auto',
        selected_timezone: selectedTimezone,
      }),
    }),

  toggleAlarm: (alarmId: string) =>
    request<BackendAlarm>(`/alarms/${alarmId}/toggle`, { method: 'PATCH' }),

  deleteAlarm: (alarmId: string) =>
    request<void>(`/alarms/${alarmId}`, { method: 'DELETE' }),

  revealAlarm: (alarmId: string) =>
    request<RevealResponse>(`/alarms/${alarmId}/reveal`, { method: 'POST' }),

  getCaptcha: () =>
    request<CaptchaChallenge>('/challenges/captcha'),

  verifyCaptcha: (challengeId: string, selectedIndices: number[]) =>
    request<VerifyResponse>('/challenges/captcha/verify', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, selected_indices: selectedIndices }),
    }),

  getSudoku: (blanks = 6) =>
    request<SudokuChallenge>(`/challenges/sudoku?blanks=${blanks}`),

  verifySudoku: (challengeId: string, grid: number[][]) =>
    request<VerifyResponse>('/challenges/sudoku/verify', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, grid }),
    }),

  getAiQuestion: () =>
    request<CheckinQuestionResponse>(`/ai/checkin/question?device_id=${DEVICE_ID}&send_push=false`, {
      method: 'POST',
    }),

  replyAiQuestion: (checkinId: string, userReply: string) =>
    request<CheckinReplyResponse>('/ai/checkin/reply', {
      method: 'POST',
      body: JSON.stringify({ checkin_id: checkinId, user_reply: userReply }),
    }),
};
