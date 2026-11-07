export type DesktopEditCommand = 'cut' | 'copy' | 'paste' | 'selectAll' | 'undo' | 'redo';

export interface HuandengDesktop {
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
  onEditCommand?(callback: (command: DesktopEditCommand) => void): () => void;
  editNative?(command: DesktopEditCommand): Promise<void>;
}

declare global {
  interface Window {
    huandengDesktop?: HuandengDesktop;
  }
}

export function desktopHost(): HuandengDesktop | undefined {
  return window.huandengDesktop;
}
