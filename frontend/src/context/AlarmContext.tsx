import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { api } from '../services/api';
import type { AlarmListResponse, BackendAlarm, RevealResponse } from '../services/api';

type AlarmContextValue = {
  alarms: BackendAlarm[];
  addAlarm: (alarm: BackendAlarm) => void;
  removeAlarm: (alarmId: string) => void;
  revealedMap: Record<string, RevealResponse>;
  setRevealedMap: Dispatch<SetStateAction<Record<string, RevealResponse>>>;
  refreshAlarms: () => Promise<AlarmListResponse>;
};

const AlarmContext = createContext<AlarmContextValue | null>(null);

export function AlarmProvider({ children }: { children: ReactNode }) {
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [revealedMap, setRevealedMap] = useState<Record<string, RevealResponse>>({});
  const pendingAlarms = useRef(new Map<string, BackendAlarm>());

  const addAlarm = useCallback((alarm: BackendAlarm) => {
    pendingAlarms.current.set(alarm.id, alarm);
    setAlarms((current) => current.some((item) => item.id === alarm.id) ? current : [alarm, ...current]);
  }, []);

  const removeAlarm = useCallback((alarmId: string) => {
    pendingAlarms.current.delete(alarmId);
    setAlarms((current) => current.filter((alarm) => alarm.id !== alarmId));
  }, []);

  const refreshAlarms = useCallback(async () => {
    const result = await api.listAlarms();
    const serverIds = new Set(result.alarms.map((alarm) => alarm.id));
    for (const alarmId of serverIds) pendingAlarms.current.delete(alarmId);
    const awaitingServer = Array.from(pendingAlarms.current.values())
      .filter((alarm) => !serverIds.has(alarm.id));
    setAlarms([...result.alarms, ...awaitingServer]);
    return result;
  }, []);
  const value = useMemo(() => ({ alarms, addAlarm, removeAlarm, revealedMap, setRevealedMap, refreshAlarms }), [alarms, addAlarm, removeAlarm, revealedMap, refreshAlarms]);

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarms() {
  const context = useContext(AlarmContext);
  if (!context) throw new Error('useAlarms must be used inside AlarmProvider');
  return context;
}
