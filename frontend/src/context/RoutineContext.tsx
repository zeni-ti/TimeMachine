import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type RoutineContextValue = {
  alarmEnabled: boolean;
  bedtimeEnabled: boolean;
  wakeHours: string;
  wakeMinutes: string;
  duration: number;
  wakeLabel: string;
  bedtimeLabel: string;
  setAlarmEnabled: (value: boolean) => void;
  setBedtimeEnabled: (value: boolean) => void;
  setWakeHours: (value: string) => void;
  setWakeMinutes: (value: string) => void;
  setDuration: (value: number) => void;
};

const RoutineContext = createContext<RoutineContextValue | null>(null);

export function RoutineProvider({ children }: { children: ReactNode }) {
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [bedtimeEnabled, setBedtimeEnabled] = useState(true);
  const [wakeHours, setWakeHours] = useState('07');
  const [wakeMinutes, setWakeMinutes] = useState('30');
  const [duration, setDuration] = useState(8);

  const wakeLabel = `${wakeHours}:${wakeMinutes}`;
  const bedtimeLabel = useMemo(() => {
    const hours = (Number(wakeHours) - duration + 24) % 24;
    return `${String(hours).padStart(2, '0')}:${wakeMinutes}`;
  }, [duration, wakeHours, wakeMinutes]);

  return (
    <RoutineContext.Provider
      value={{
        alarmEnabled,
        bedtimeEnabled,
        wakeHours,
        wakeMinutes,
        duration,
        wakeLabel,
        bedtimeLabel,
        setAlarmEnabled,
        setBedtimeEnabled,
        setWakeHours,
        setWakeMinutes,
        setDuration,
      }}
    >
      {children}
    </RoutineContext.Provider>
  );
}

export function useRoutine() {
  const context = useContext(RoutineContext);
  if (!context) throw new Error('useRoutine must be used inside RoutineProvider');
  return context;
}
