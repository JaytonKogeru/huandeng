export interface HuandingDesktop {
  platform: string;
  openProject(): Promise<{ entryPath: string } | null>;
  newProject(): Promise<{ entryPath: string } | null>;
  recentProjects(): Promise<{ entryPath: string; title: string; openedAt: string }[]>;
  openRecent(entryPath: string): Promise<void>;
  revealPath(relativePath?: string): Promise<void>;
  getContext(): Promise<{
    entryPath: string | null;
    readOnly: boolean;
    serviceUrl: string | null;
  }>;
  onContextChanged(callback: () => void): () => void;
  onBeforeLeave(callback: () => Promise<void>): () => void;
}

declare global {
  interface Window {
    huandingDesktop?: HuandingDesktop;
  }
}

export function desktopHost(): HuandingDesktop | undefined {
  return window.huandingDesktop;
}
