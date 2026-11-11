export interface WorkspaceLayout {
  notesDock: 'bottom' | 'right';
  notesHeight: number;
  notesWidth: number;
  navigationWidth: number;
  inspectorWidth: number;
  notesOpen: boolean;
  navigationCollapsed: boolean;
  inspectorCollapsed: boolean;
}

export interface WorkspaceLayoutUpdate {
  clientId: string;
  revision: number;
  layout: WorkspaceLayout;
}

export interface DesktopLeaveData {
  workspaceLayout?: WorkspaceLayoutUpdate;
}

export type DesktopEditCommand = 'cut' | 'copy' | 'paste' | 'selectAll' | 'undo' | 'redo';

export interface HuandengDesktop {
  platform: string;
  workspaceTabs?: boolean;
  showHome?(): Promise<void>;
  closeProject?(id?: string): Promise<void>;
  onCloseDocument?(callback: () => void): () => void;
  reportProjectState?(value: {
    title?: string;
    dirty?: boolean;
    saving?: boolean;
    attention?: boolean;
    activity?: boolean;
    revision?: string;
  }): Promise<void>;
  setPresentationMode?(active: boolean): Promise<{ fullscreen: boolean }>;
  setFullscreen?(fullscreen: boolean): Promise<boolean>;
  onFullscreenChanged?(callback: (fullscreen: boolean) => void): () => void;
  getWorkspaceLayout?(clientId?: string): Promise<WorkspaceLayout>;
  setWorkspaceLayout?(value: WorkspaceLayoutUpdate): Promise<WorkspaceLayout>;
  getLocale?(): Promise<'en' | 'zh-CN'>;
  setLocale?(locale: 'en' | 'zh-CN'): Promise<'en' | 'zh-CN'>;
  onLocaleChanged?(callback: (locale: 'en' | 'zh-CN') => void): () => void;
  getSnapping?(): Promise<boolean>;
  setSnapping?(enabled: boolean): Promise<boolean>;
  onSnappingChanged?(callback: (enabled: boolean) => void): () => void;
  getAgentConfiguration?(client: 'deepseek' | 'codex' | 'claude' | 'chatgpt'): Promise<{
    client: string;
    entryPath: string;
    pluginPath: string;
    configuration: string;
  }>;
  onAgentConnection?(callback: () => void): () => void;
  openProject(): Promise<{ entryPath: string } | null>;
  openProjectFolder?(): Promise<{ entryPath: string } | null>;
  identifyProjectFolder?(): Promise<{ status: string; reason?: string; message?: string } | null>;
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
  onBeforeLeave(callback: () => Promise<void> | Promise<DesktopLeaveData>): () => void;
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
