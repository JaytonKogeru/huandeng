import type { PageSize, PptdElement } from '../../pptd/types';
import { desktopHost } from './huandeng-desktop';

export const HUANDENG_CLIPBOARD_MIME = 'web application/vnd.huandeng.elements+json';
export type RichClipboardRead = { json: string | null; image: Blob | null };

export function selectionImageBounds(
  elements: readonly PptdElement[],
  ids: ReadonlySet<string>,
  size: PageSize,
): { x: number; y: number; width: number; height: number } {
  const selected = elements.filter((element) => ids.has(element.elementId) && element.bounds);
  if (!selected.length) throw new Error('Select an object to copy.');
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const element of selected) {
    if (!element.bounds) continue;
    const [x, y, w, h] = element.bounds;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const radians = ((element.rotation ?? 0) * Math.PI) / 180;
    const halfWidth = (Math.abs(w * Math.cos(radians)) + Math.abs(h * Math.sin(radians))) / 2;
    const halfHeight = (Math.abs(w * Math.sin(radians)) + Math.abs(h * Math.cos(radians))) / 2;
    minX = Math.min(minX, cx - halfWidth);
    minY = Math.min(minY, cy - halfHeight);
    maxX = Math.max(maxX, cx + halfWidth);
    maxY = Math.max(maxY, cy + halfHeight);
  }
  // Include the stroke without including other objects or the editor selection handles.
  const x = Math.max(0, Math.floor(minX - 5));
  const y = Math.max(0, Math.floor(minY - 5));
  const right = Math.min(size[0], Math.ceil(maxX + 5));
  const bottom = Math.min(size[1], Math.ceil(maxY + 5));
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}

async function loadedImages(root: HTMLElement): Promise<void> {
  await Promise.all(
    [...root.querySelectorAll('img')].map(
      (image) =>
        new Promise<void>((resolve, reject) => {
          if (image.complete)
            return image.naturalWidth
              ? resolve()
              : reject(new Error('Copied image is unavailable.'));
          const timeout = window.setTimeout(
            () => reject(new Error('Copied image did not finish loading.')),
            6000,
          );
          image.addEventListener(
            'load',
            () => {
              window.clearTimeout(timeout);
              resolve();
            },
            { once: true },
          );
          image.addEventListener(
            'error',
            () => {
              window.clearTimeout(timeout);
              reject(new Error('Copied image is unavailable.'));
            },
            { once: true },
          );
        }),
    ),
  );
}

/** Copy what the selected slide objects actually look like, not their raw asset bytes. */
export async function renderSelectionPng(
  pageId: string,
  elements: readonly PptdElement[],
  selectedIds: ReadonlySet<string>,
  size: PageSize,
): Promise<Blob> {
  const original = document.querySelector<HTMLElement>(
    `[data-hd-editor-canvas] [data-pptd-page="${CSS.escape(pageId)}"]`,
  );
  if (!original) throw new Error('Open the slide canvas before copying objects as an image.');
  const rect = selectionImageBounds(elements, selectedIds, size);
  const frame = original.cloneNode(true) as HTMLElement;
  frame.style.background = 'transparent';
  frame.style.boxShadow = 'none';
  for (const child of [...frame.children]) {
    const id = child.getAttribute('data-hd-element-id');
    if (!id || !selectedIds.has(id)) child.remove();
  }
  const root = document.createElement('div');
  root.style.cssText =
    `position:fixed;left:0;top:0;width:${rect.width}px;height:${rect.height}px;` +
    'overflow:hidden;pointer-events:none;isolation:isolate;background:transparent;opacity:0;';
  frame.style.position = 'absolute';
  frame.style.left = `-${rect.x}px`;
  frame.style.top = `-${rect.y}px`;
  frame.style.margin = '0';
  root.append(frame);
  document.body.append(root);
  try {
    await loadedImages(frame);
    // Fonts may include a permanently pending external font. Do not stall Ctrl+C for it.
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
    ]);
    const { toBlob } = await import('html-to-image');
    const blob = await toBlob(root, {
      width: rect.width,
      height: rect.height,
      pixelRatio: 2,
      // The live capture is kept off-screen; the cloned SVG must be at its own origin.
      style: { position: 'relative', left: '0', top: '0', opacity: '1' },
      backgroundColor: undefined,
      skipFonts: true,
      cacheBust: false,
    });
    if (!blob || blob.size === 0) throw new Error('Could not render the selected objects as PNG.');
    return blob;
  } finally {
    root.remove();
  }
}

function base64ToBlob(value: string): Blob {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}
function arrayBufferToBase64(bytes: ArrayBuffer): string {
  const data = new Uint8Array(bytes);
  let text = '';
  for (let i = 0; i < data.length; i += 8192)
    text += String.fromCharCode(...data.subarray(i, i + 8192));
  return btoa(text);
}

export async function writeRichSelection(json: string, png?: Blob): Promise<void> {
  const host = desktopHost();
  if (host?.writeRichClipboard) {
    await host.writeRichClipboard({
      mode: png ? 'rich' : 'json',
      json,
      ...(png ? { pngBase64: arrayBufferToBase64(await png.arrayBuffer()) } : {}),
    });
    return;
  }
  if (!png) {
    await navigator.clipboard.writeText(json);
    return;
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': png,
      [HUANDENG_CLIPBOARD_MIME]: new Blob([json], {
        type: 'application/vnd.huandeng.elements+json',
      }),
    }),
  ]);
}

export async function readRichSelection(): Promise<RichClipboardRead> {
  const host = desktopHost();
  if (host?.readRichClipboard) {
    const payload = await host.readRichClipboard();
    return {
      json: payload.json,
      image: payload.pngBase64 ? base64ToBlob(payload.pngBase64) : null,
    };
  }
  try {
    for (const item of await navigator.clipboard.read()) {
      const json = item.types.includes(HUANDENG_CLIPBOARD_MIME)
        ? await (await item.getType(HUANDENG_CLIPBOARD_MIME)).text()
        : null;
      const image = item.types.includes('image/png') ? await item.getType('image/png') : null;
      if (json || image) return { json, image };
    }
  } catch {
    // Browser permissions may deny asynchronous read; native paste event remains the fallback.
  }
  return { json: null, image: null };
}
