'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ThemePreference } from '@/lib/types';

const STORAGE_KEY = 'ube-theme';

/**
 * Runs before paint so the first frame is already in the right theme.
 * Kept as a string because it is injected with dangerouslySetInnerHTML.
 */
export const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var pref = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var dark = pref === 'dark' ||
      (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  return dark ? 'dark' : 'light';
}

export function ThemeProvider({
  children,
  initial = 'system',
  onPersist,
}: {
  children: React.ReactNode;
  /** The signed-in user's saved preference, when there is one. */
  initial?: ThemePreference;
  /** Called when the user changes theme, so it can be saved to their profile. */
  onPersist?: (p: ThemePreference) => void;
}) {
  const [preference, setPref] = useState<ThemePreference>(initial);
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  // Local storage wins on first paint; the profile value seeds a new device.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    const start = stored ?? initial;
    setPref(start);
    setResolved(apply(start));
    if (!stored && initial) localStorage.setItem(STORAGE_KEY, initial);
  }, [initial]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setResolved(apply('system'));
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [preference]);

  const setPreference = useCallback(
    (p: ThemePreference) => {
      setPref(p);
      setResolved(apply(p));
      try {
        localStorage.setItem(STORAGE_KEY, p);
      } catch {
        /* private mode */
      }
      onPersist?.(p);
    },
    [onPersist],
  );

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
    <circle cx="12" cy="12" r="4" />
    <path
      strokeLinecap="round"
      d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
    />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

const AutoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
  </svg>
);

const OPTIONS: { value: ThemePreference; label: string; icon: () => JSX.Element }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'Auto', icon: AutoIcon },
];

/** Three-way segmented control: Light / Dark / Auto. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className="inline-flex border border-line"
      role="radiogroup"
      aria-label="Colour theme"
      suppressHydrationWarning
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={`${label} theme`}
            onClick={() => setPreference(value)}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium transition-colors',
              active ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            <Icon />
            {!compact && <span className="hidden sm:inline">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
