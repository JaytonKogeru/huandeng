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
      {(['edit', 'browse', 'notes'] as const).map((view) => (
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
          {t(view === 'edit' ? 'Edit' : view === 'browse' ? 'Section browser' : 'Notes page')}
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
}: {
  page: PageSnapshot;
  size: PageSize;
  theme: PptdTheme;
  eager?: boolean;
}) {
  const { t } = useHuandengLocale();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  return (
    <div
      ref={ref}
      className="hd-workspace-preview"
      style={{ aspectRatio: `${size[0]} / ${size[1]}` }}
      data-hd-workspace-preview={workspacePageKey(page)}
      aria-hidden="true"
    >
      {visible ? (
        <SlideCanvas width={size[0]} height={size[1]} flat freezeMotion>
          <PptdPageRenderer page={page} size={size} theme={theme} assetUrl={pptdAssetPreviewUrl} />
        </SlideCanvas>
      ) : (
        <span className="text-xs text-muted-foreground">{t('Slide preview')}</span>
      )}
    </div>
  );
});
