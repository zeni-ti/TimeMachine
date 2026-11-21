import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useMemo, useState } from 'react';

export type Zone = { label: string; offset: number };
export type Alarm = { id: number; hour: number; minute: number; period: 'AM' | 'PM'; zone: Zone; enabled: boolean; revealed: boolean; extraConfirmations: number };

export const ALARM_ZONES: Zone[] = [
  { label: 'Niue', offset: -11 }, { label: 'Honolulu', offset: -10 }, { label: 'Los Angeles', offset: -8 },
  { label: 'New York', offset: -5 }, { label: 'Reykjavik', offset: 0 }, { label: 'Kathmandu', offset: 5.75 },
  { label: 'Bangkok', offset: 7 }, { label: 'Tokyo', offset: 9 }, { label: 'Kiritimati', offset: 14 },
];
export function getRandomZone() {
  return ALARM_ZONES[Math.floor(Math.random() * ALARM_ZONES.length)];
}

type AlarmContextValue = { alarms: Alarm[]; setAlarms: Dispatch<SetStateAction<Alarm[]>> };
const AlarmContext = createContext<AlarmContextValue | null>(null);

export function AlarmProvider({ children }: { children: ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const value = useMemo(() => ({ alarms, setAlarms }), [alarms]);
  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarms() {
  const context = useContext(AlarmContext);
  if (!context) throw new Error('useAlarms must be used inside AlarmProvider');
  return context;
}
