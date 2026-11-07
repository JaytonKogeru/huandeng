import { Component, type ReactNode, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useParams } from 'react-router-dom';
import { PptdPageRenderer, type PptdTheme } from '@/components/pptd/renderer';
import { PptdBackend, pptdAssetUrl } from '@/lib/pptd-backend';
import type { DeckSnapshot } from '../../pptd/types';

declare global {
  interface Window {
    __HUANDENG_EXPORT_READY__?: boolean;
    __HUANDENG_EXPORT_SEEK__?: (pageIndex: number, timeMs: number) => Promise<void>;
  }
}

export function HuandengExport() {
  const { exportId = '' } = useParams();
  const [snapshot, setSnapshot] = useState<DeckSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState({ pageIndex: 0, timeMs: 0 });
  const parameters = new URLSearchParams(window.location.search);
  const framesMode = parameters.get('mode') === 'frames';
  const width = Number(parameters.get('width')) || 1280;
  const height = Number(parameters.get('height')) || 720;
  const assetUrl = useMemo(() => (path: string) => pptdAssetUrl(path, exportId), [exportId]);

  useEffect(() => {
    window.__HUANDENG_EXPORT_READY__ = false;
    let disposed = false;
    void new PptdBackend()
      .exportSnapshot(exportId)
      .then((result) => {
        if (!disposed) setSnapshot(result);
      })
      .catch((failure: unknown) => {
        if (!disposed) {
          setError(failure instanceof Error ? failure.message : String(failure));
          window.__HUANDENG_EXPORT_READY__ = true;
        }
      });
    return () => {
      disposed = true;
      window.__HUANDENG_EXPORT_READY__ = false;
    };
  }, [exportId]);

  useEffect(() => {
    if (!snapshot) return;
    let disposed = false;
    void (async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.querySelectorAll<HTMLImageElement>('[data-hd-export-page] img')).map(
          async (image) => {
            if (!image.complete)
              await new Promise<void>((resolve) => {
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener('error', () => resolve(), { once: true });
              });
            if (image.naturalWidth > 0) await image.decode().catch(() => {});
          },
        ),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (!disposed) window.__HUANDENG_EXPORT_READY__ = true;
    })();
    return () => {
      disposed = true;
    };
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot || !framesMode) return;
    window.__HUANDENG_EXPORT_SEEK__ = async (pageIndex, timeMs) => {
      if (
        !Number.isInteger(pageIndex) ||
        !snapshot.pages[pageIndex] ||
        !Number.isFinite(timeMs) ||
        timeMs < 0
      )
        throw new Error('视频采样位置无效。');
      flushSync(() => setFrame({ pageIndex, timeMs }));
      await document.fonts.ready;
      const until = performance.now() + 30000;
      while (document.querySelector('[data-hd-loading]')) {
        if (performance.now() > until) throw new Error('页面对象准备超时。');
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      await Promise.all(
        Array.from(document.querySelectorAll<HTMLImageElement>('[data-hd-export-page] img')).map(
          async (image) => {
            if (!image.complete)
              await new Promise<void>((resolve, reject) => {
                const cleanup = () => {
                  clearTimeout(timer);
                  image.removeEventListener('load', loaded);
                  image.removeEventListener('error', failed);
                };
                const loaded = () => {
                  cleanup();
                  resolve();
                };
                const failed = () => {
                  cleanup();
                  reject(new Error('图片载入失败。'));
                };
                const timer = setTimeout(() => {
                  cleanup();
                  reject(new Error('图片载入超时。'));
                }, 30000);
                image.addEventListener('load', loaded, { once: true });
                image.addEventListener('error', failed, { once: true });
              });
            if (!image.naturalWidth) throw new Error('图片未能正确解码。');
            await image.decode();
          },
        ),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const problems = Array.from(
        document.querySelectorAll(
          '[data-hd-export-error], [data-hd-formula-error], [data-hd-animation-error], [data-hd-unsupported="true"]',
        ),
      );
      if (problems.length)
        throw new Error(
          problems
            .map((node) => node.textContent || node.getAttribute('data-hd-animation-error'))
            .join('\n'),
        );
    };
    return () => {
      window.__HUANDENG_EXPORT_SEEK__ = undefined;
    };
  }, [snapshot, framesMode]);

  if (error) return <div data-hd-export-error>{error}</div>;
  if (!snapshot) return <div>准备固定版本…</div>;
  return (
    <ExportBoundary>
      <style>{`
      body { margin: 0; background: #fff; }
      .hd-export-page { position: relative; width: ${snapshot.size[0]}px; height: ${snapshot.size[1]}px; overflow: hidden; background: #fff; }
      .hd-export-content { transform-origin: top left; }
      ${framesMode ? `.hd-export-page { width: ${width}px; height: ${height}px; } .hd-export-content { transform: scale(${Math.min(width / snapshot.size[0], height / snapshot.size[1])}); }` : ''}
      @page { size: ${snapshot.size[0] / 72}in ${snapshot.size[1] / 72}in; margin: 0; }
      @media print {
        html, body, #root { margin: 0; padding: 0; background: #fff; }
        .hd-export-page { width: ${snapshot.size[0]}pt; height: ${snapshot.size[1]}pt; break-after: page; break-inside: avoid; }
        .hd-export-page[data-hd-last-page="true"] { break-after: auto; }
        [data-sonner-toaster] { display: none !important; }
        .hd-export-content { transform: scale(1.3333333333333333); }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
      {snapshot.pages.map(
        (page, index) =>
          (!framesMode || frame.pageIndex === index) && (
            <section
              key={page.occurrenceId ?? page.pageId}
              className="hd-export-page"
              data-hd-export-page={page.occurrenceId ?? page.pageId}
              data-hd-source-page={page.pageId}
              data-hd-last-page={index === snapshot.pages.length - 1}
              data-hd-render-revision={page.renderRevision}
            >
              <div className="hd-export-content">
                <PptdPageRenderer
                  page={page}
                  size={snapshot.size}
                  theme={(snapshot.manifest.theme ?? {}) as PptdTheme}
                  assetUrl={assetUrl}
                  previewTimeMs={framesMode ? frame.timeMs : undefined}
                />
              </div>
            </section>
          ),
      )}
    </ExportBoundary>
  );
}

class ExportBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch() {
    window.__HUANDENG_EXPORT_READY__ = true;
  }

  render() {
    return this.state.error ? (
      <div data-hd-export-error>{this.state.error}</div>
    ) : (
      this.props.children
    );
  }
}
