import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { TimeMachineSplash } from '../components/TimeMachineSplash';

type SplashContextValue = { splashVisible: boolean };
const SplashContext = createContext<SplashContextValue | null>(null);

export function SplashProvider({ children }: { children: ReactNode }) {
  const [splashVisible, setSplashVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Syncing local timezone...');
  const value = useMemo(() => ({ splashVisible }), [splashVisible]);

  useEffect(() => {
    if (!splashVisible) return;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 25;
      if (elapsed <= 2500) setProgress(Math.min(99, elapsed / 2500 * 99));
      if (elapsed >= 2500) setStatus('Picking a random continent instead...');
      if (elapsed >= 2850) {
        clearInterval(interval);
        setProgress(100);
        setSplashVisible(false);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [splashVisible]);

  return (
    <SplashContext.Provider value={value}>
      {children}
      {splashVisible && <TimeMachineSplash progress={progress} status={status} onSkip={() => setSplashVisible(false)} />}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  const context = useContext(SplashContext);
  if (!context) throw new Error('useSplash must be used inside SplashProvider');
  return context;
}
