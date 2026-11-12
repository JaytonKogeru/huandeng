import { useTheme } from 'next-themes';
import { useCallback, useEffect } from 'react';
import { desktopHost } from './huandeng-desktop';

export type InterfaceTheme = 'system' | 'light' | 'dark';

function isInterfaceTheme(value: unknown): value is InterfaceTheme {
  return value === 'system' || value === 'light' || value === 'dark';
}

export async function initializeInterfaceTheme(): Promise<void> {
  const host = desktopHost();
  if (!host?.getTheme) return;
  const theme = await host.getTheme();
  if (!isInterfaceTheme(theme)) throw new Error('Invalid desktop interface theme.');
  // Each Project uses a different localhost origin; the desktop preference is authoritative.
  localStorage.setItem('theme', theme);
}

export function DesktopThemeSync() {
  const { setTheme } = useTheme();
  useEffect(() => {
    const host = desktopHost();
    if (!host?.getTheme) return;
    let active = true;
    let broadcastReceived = false;
    const stop = host.onThemeChanged?.((theme) => {
      broadcastReceived = true;
      if (active && isInterfaceTheme(theme)) setTheme(theme);
    });
    void host.getTheme().then(
      (theme) => {
        if (active && !broadcastReceived && isInterfaceTheme(theme)) setTheme(theme);
      },
      (error) => console.error('Could not read the current desktop theme.', error),
    );
    return () => {
      active = false;
      stop?.();
    };
  }, [setTheme]);
  return null;
}

export function useInterfaceTheme() {
  const { theme, setTheme } = useTheme();
  const changeTheme = useCallback(
    async (next: InterfaceTheme) => {
      if (!isInterfaceTheme(next)) throw new Error('Invalid interface theme.');
      const host = desktopHost();
      if (host?.setTheme) {
        const saved = await host.setTheme(next);
        if (!isInterfaceTheme(saved)) throw new Error('Invalid saved interface theme.');
        // The desktop broadcast owns ordering across simultaneous Project changes.
      } else setTheme(next);
    },
    [setTheme],
  );
  return { theme, setTheme: changeTheme };
}
