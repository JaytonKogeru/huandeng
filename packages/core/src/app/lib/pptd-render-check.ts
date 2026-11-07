import type { Diagnostic } from '../../pptd/types';

const GENERIC_FONTS = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
]);

export interface FontResolution {
  requested: string;
  resolved: string | null;
  status: 'available' | 'fallback' | 'generic' | 'unverified';
  elementIds: string[];
}

export interface RenderCheck {
  pageId: string;
  renderRevision: string;
  checkedAt: number;
  fonts: FontResolution[];
  fontAccess: 'granted' | 'denied' | 'unsupported';
  fontsReady: boolean;
  inspectedTextBlocks: number;
  skippedTextBlocks: number;
  issues: Diagnostic[];
}

export function fontFamilies(stack: string): string[] {
  return (stack.match(/(?:"[^"]*"|'[^']*'|[^,])+/g) ?? [])
    .map((part) =>
      part
        .trim()
        .replace(/^(['"])(.*)\1$/, '$2')
        .trim(),
    )
    .filter(Boolean);
}

function fontKey(family: string): string {
  return family
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .toLocaleLowerCase();
}

export function resolveFontStack(
  stack: string,
  available: Set<string>,
  verified: boolean,
): Omit<FontResolution, 'elementIds'> {
  const families = fontFamilies(stack);
  const first = families[0] ?? 'system-ui';
  if (GENERIC_FONTS.has(fontKey(first)))
    return { requested: stack, resolved: first, status: 'generic' };
  const normalized = new Set([...available].map(fontKey));
  if (normalized.has(fontKey(first)))
    return { requested: stack, resolved: first, status: 'available' };
  if (!verified) return { requested: stack, resolved: null, status: 'unverified' };
  const resolved =
    families.find(
      (family) => normalized.has(fontKey(family)) || GENERIC_FONTS.has(fontKey(family)),
    ) ?? null;
  return { requested: stack, resolved, status: 'fallback' };
}

export interface LayoutExtent {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function outsideFrame(
  extent: LayoutExtent,
  width: number,
  height: number,
  tolerance = 1,
): boolean {
  return (
    extent.left < -tolerance ||
    extent.top < -tolerance ||
    extent.right > width + tolerance ||
    extent.bottom > height + tolerance
  );
}

function localExtent(node: HTMLElement, frame: HTMLElement): LayoutExtent | null {
  let current: HTMLElement | null = node;
  let left = 0;
  let top = 0;
  while (current && current !== frame) {
    left += current.offsetLeft;
    top += current.offsetTop;
    current = current.offsetParent instanceof HTMLElement ? current.offsetParent : null;
  }
  if (current !== frame) return null;
  return {
    left,
    top,
    right: left + Math.max(node.offsetWidth, node.scrollWidth),
    bottom: top + Math.max(node.offsetHeight, node.scrollHeight),
  };
}

function textStacks(canvas: HTMLElement): Map<string, Set<string>> {
  const stacks = new Map<string, Set<string>>();
  const walker = document.createTreeWalker(canvas, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const parent = node.parentElement;
    if (!parent || parent.closest('[aria-hidden="true"],script,style')) continue;
    const style = getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const id = parent.closest<HTMLElement>('[data-hd-element-id]')?.dataset.hdElementId;
    const ids = stacks.get(style.fontFamily) ?? new Set<string>();
    if (id) ids.add(id);
    stacks.set(style.fontFamily, ids);
  }
  return stacks;
}

export async function inspectRenderedPage(
  canvas: HTMLElement,
  pageId: string,
  renderRevision: string,
): Promise<RenderCheck> {
  const localFonts = (
    window as Window & { queryLocalFonts?: () => Promise<Array<{ family: string }>> }
  ).queryLocalFonts;
  // Request access before the first await so the browser sees the button's user gesture.
  const inventory = localFonts
    ? localFonts.call(window).then(
        (fonts) => ({ access: 'granted' as const, families: fonts.map((font) => font.family) }),
        () => ({ access: 'denied' as const, families: [] as string[] }),
      )
    : Promise.resolve({ access: 'unsupported' as const, families: [] as string[] });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ready = await Promise.race([
    document.fonts.ready.then(() => true),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), 3000);
    }),
  ]);
  if (timer) clearTimeout(timer);
  const local = await inventory;
  const available = new Set(local.families);
  for (const face of document.fonts) if (face.status === 'loaded') available.add(face.family);
  const stacks = textStacks(canvas);
  if (local.access === 'granted') {
    const normalized = new Set([...available].map(fontKey));
    const aliases = [...new Set([...stacks.keys()].flatMap(fontFamilies))]
      .filter((family) => !GENERIC_FONTS.has(fontKey(family)) && !normalized.has(fontKey(family)))
      .slice(0, 64);
    await Promise.all(
      aliases.map(async (family) => {
        try {
          await new FontFace('huandeng-font-check', `local(${JSON.stringify(family)})`).load();
          available.add(family);
        } catch {
          /* An unresolved local alias remains a fallback candidate. */
        }
      }),
    );
  }
  const fonts = [...stacks].map(([stack, ids]) => ({
    ...resolveFontStack(stack, available, local.access === 'granted'),
    elementIds: [...ids],
  }));
  const issues: Diagnostic[] = [];
  const overflowIds = new Set<string>();
  let inspectedTextBlocks = 0;
  let skippedTextBlocks = 0;
  for (const block of canvas.querySelectorAll<HTMLElement>('[data-hd-text-content]')) {
    const frame = block.closest<HTMLElement>('[data-hd-element-id]');
    const id = frame?.dataset.hdElementId;
    if (!frame || !id || !frame.clientWidth || !frame.clientHeight || !ready) {
      skippedTextBlocks++;
      continue;
    }
    const extent = localExtent(block, frame);
    if (!extent) {
      skippedTextBlocks++;
      continue;
    }
    inspectedTextBlocks++;
    const descendants = block.querySelectorAll<HTMLElement>('*');
    for (const child of descendants) {
      if (!(child instanceof HTMLElement) || child.getAttribute('aria-hidden') === 'true') continue;
      const childExtent = localExtent(child, frame);
      if (!childExtent) continue;
      extent.left = Math.min(extent.left, childExtent.left);
      extent.top = Math.min(extent.top, childExtent.top);
      extent.right = Math.max(extent.right, childExtent.right);
      extent.bottom = Math.max(extent.bottom, childExtent.bottom);
    }
    if (outsideFrame(extent, frame.clientWidth, frame.clientHeight)) overflowIds.add(id);
  }
  for (const elementId of overflowIds)
    issues.push({
      code: 'QA_TEXT_OVERFLOW',
      severity: 'warning',
      pageId,
      elementId,
      message: '文字或公式的排版范围超出对象外框，请确认是否为有意设计。',
    });
  for (const font of fonts)
    if (font.status === 'fallback')
      issues.push({
        code: 'QA_FONT_FALLBACK',
        severity: 'warning',
        pageId,
        elementId: font.elementIds[0],
        message: `本机未找到首选字体 ${fontFamilies(font.requested)[0]}；当前字体列表将回退到 ${font.resolved ?? '浏览器默认字体'}。`,
      });
  return {
    pageId,
    renderRevision,
    checkedAt: Date.now(),
    fonts,
    fontAccess: local.access,
    fontsReady: ready,
    inspectedTextBlocks,
    skippedTextBlocks,
    issues,
  };
}
