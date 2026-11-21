import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { api } from '../services/api';
import type { AlarmListResponse, BackendAlarm, RevealResponse } from '../services/api';

type AlarmContextValue = {
  alarms: BackendAlarm[];
  setAlarms: Dispatch<SetStateAction<BackendAlarm[]>>;
  revealedMap: Record<string, RevealResponse>;
  setRevealedMap: Dispatch<SetStateAction<Record<string, RevealResponse>>>;
  refreshAlarms: () => Promise<AlarmListResponse>;
};

const AlarmContext = createContext<AlarmContextValue | null>(null);

export function AlarmProvider({ children }: { children: ReactNode }) {
  const [alarms, setAlarms] = useState<BackendAlarm[]>([]);
  const [revealedMap, setRevealedMap] = useState<Record<string, RevealResponse>>({});
  const refreshAlarms = useCallback(async () => {
    const result = await api.listAlarms();
    setAlarms(result.alarms);
    return result;
  }, []);
  const value = useMemo(() => ({ alarms, setAlarms, revealedMap, setRevealedMap, refreshAlarms }), [alarms, revealedMap, refreshAlarms]);

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarms() {
  const context = useContext(AlarmContext);
  if (!context) throw new Error('useAlarms must be used inside AlarmProvider');
  return context;
}
