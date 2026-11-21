import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useMemo, useState } from 'react';

type SessionContextValue = { seconds: number; setSeconds: Dispatch<SetStateAction<number>> };
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [seconds, setSeconds] = useState(45);
  const value = useMemo(() => ({ seconds, setSeconds }), [seconds]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
