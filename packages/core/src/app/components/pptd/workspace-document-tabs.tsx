import { FileText, PanelsTopLeft, X } from 'lucide-react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';

export function WorkspaceDocumentTabs({
  files,
  activePath,
  onSelect,
  onClose,
}: {
  files: string[];
  activePath: string | null;
  onSelect: (path: string | null) => void;
  onClose: (path: string) => void;
}) {
  useHuandengLocale();
  const paths = [null, ...files];
  const label = (path: string) => {
    const parts = path.split('/');
    const name = parts.at(-1) ?? path;
    return files.filter((item) => item.split('/').at(-1) === name).length > 1
      ? parts.slice(-2).join('/')
      : name;
  };
  return (
    <div
      className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-border bg-sidebar px-1"
      role="tablist"
      aria-label={t('Workspace documents')}
      data-hd-document-tabs
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        if (!(event.target instanceof HTMLElement) || event.target.getAttribute('role') !== 'tab')
          return;
        event.preventDefault();
        const index = paths.indexOf(activePath);
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? paths.length - 1
              : (index + (event.key === 'ArrowRight' ? 1 : -1) + paths.length) % paths.length;
        onSelect(paths[next]);
        const target = event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next];
        target?.focus({ preventScroll: true });
      }}
    >
      {paths.map((path) => (
        <div
          key={path ?? 'slides'}
          className={`flex min-w-0 shrink-0 items-center border-r border-border/70 ${activePath === path ? 'bg-background shadow-[inset_0_2px_0_0_var(--color-brand)]' : ''}`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activePath === path}
            tabIndex={activePath === path ? 0 : -1}
            className="flex h-full max-w-64 items-center gap-1.5 px-3 text-xs hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
            title={path ?? t('Slides')}
            data-hd-document-tab={path ?? 'slides'}
            onClick={() => onSelect(path)}
          >
            {path ? (
              <FileText className="size-3 shrink-0" />
            ) : (
              <PanelsTopLeft className="size-3 shrink-0" />
            )}
            <span className="truncate">{path ? label(path) : t('Slides')}</span>
          </button>
          {path && (
            <button
              type="button"
              className="mr-1 grid size-6 shrink-0 place-items-center rounded hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={t('Close {name}', { name: label(path) })}
              title={t('Close file preview')}
              onClick={() => onClose(path)}
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
