import { memo, useEffect, useRef, useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { pptdAssetPreviewUrl } from '@/lib/pptd-backend';
import { type WorkspaceView, workspacePageKey } from '@/lib/pptd-workspace-views';
import type { PageSize, PageSnapshot } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import { PptdPageRenderer, type PptdTheme } from './renderer';

export type { WorkspaceView } from '@/lib/pptd-workspace-views';

export function WorkspaceViewSwitcher({
  value,
  blocked,
  onChange,
}: {
  value: WorkspaceView;
  blocked: boolean;
  onChange: (value: WorkspaceView) => void;
}) {
  const { t } = useHuandengLocale();
  return (
    <nav
      className="hd-workspace-view-switch"
      aria-label={t('Slide workspace views')}
      data-hd-workspace-views
    >
      {(['edit', 'outline', 'browse', 'notes'] as const).map((view) => (
        <Button
          key={view}
          size="xs"
          variant={value === view ? 'secondary' : 'ghost'}
          aria-pressed={value === view}
          data-hd-workspace-view={view}
          disabled={blocked && value !== view}
          title={
            blocked
              ? t(
                  'Save or discard panel drafts and finish text composition before switching views.',
                )
              : undefined
          }
          onClick={() => onChange(view)}
        >
          {t(
            view === 'edit'
              ? 'Normal'
              : view === 'outline'
                ? 'Outline'
                : view === 'browse'
                  ? 'Section browser'
                  : 'Notes page',
          )}
        </Button>
      ))}
    </nav>
  );
}

export const WorkspaceSlidePreview = memo(function WorkspaceSlidePreview({
  page,
  size,
  theme,
  eager = false,
  viewport,
}: {
  page: PageSnapshot;
  size: PageSize;
  theme: PptdTheme;
  eager?: boolean;
  viewport?: HTMLElement | null;
}) {
  const { t } = useHuandengLocale();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  useEffect(() => {
    const node = ref.current;
    if (!node || eager || viewport === null) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    let active = true;
    setVisible(false);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!active) return;
        for (const entry of entries) if (entry.target === node) setVisible(entry.isIntersecting);
      },
      { root: viewport, rootMargin: '300px' },
    );
    observer.observe(node);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [eager, viewport]);
  return (
    <div
      ref={ref}
      className="hd-workspace-preview"
      style={{ aspectRatio: `${size[0]} / ${size[1]}` }}
      data-hd-workspace-preview={workspacePageKey(page)}
      aria-hidden="true"
    >
      {eager || visible ? (
        <SlideCanvas width={size[0]} height={size[1]} flat freezeMotion>
          <PptdPageRenderer page={page} size={size} theme={theme} assetUrl={pptdAssetPreviewUrl} />
        </SlideCanvas>
      ) : (
        <span className="text-xs text-muted-foreground">{t('Slide preview')}</span>
      )}
    </div>
  );
});
