import katex from 'katex';
import {
  type CSSProperties,
  Fragment,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { pptdAssetUrl } from '@/lib/pptd-backend';
import { splitMathFragments } from '../../../pptd/math-fragments';
import { presetShapePath, SHAPE_PRESETS } from '../../../pptd/shape-presets';
import { tableLayout } from '../../../pptd/table-grid';
import {
  resolveTableCellStyle,
  TABLE_CELL_PADDING_X,
  TABLE_CELL_PADDING_Y,
} from '../../../pptd/table-style';
import type { PageSize, PageSnapshot, PptdElement } from '../../../pptd/types';
import { ChartContent, IconContent } from './science-renderer';

export type PptdTheme = {
  colors?: Record<string, string>;
  textStyles?: Record<string, Record<string, unknown>>;
  tableStyles?: Record<string, Record<string, unknown>>;
  chartColors?: string[];
};

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function resolveColor(value: unknown, theme: PptdTheme, fallback = '#000000'): string {
  const color = textValue(value, fallback);
  return color.startsWith('$') ? (theme.colors?.[color.slice(1)] ?? fallback) : color;
}

export function textContent(element: PptdElement, theme: PptdTheme = {}) {
  const content = record(element.content);
  const key = textValue(content.style).replace(/^\$/, '');
  return { ...theme.textStyles?.[key], ...content };
}

export function textCss(content: Record<string, unknown>, theme: PptdTheme = {}): CSSProperties {
  const family = content.fontFamily;
  const fontFamily =
    typeof family === 'string'
      ? family
      : [record(family).latin, record(family).ea].filter((v) => typeof v === 'string').join(', ');
  const align = Array.isArray(content.align) ? content.align : ['left', 'top'];
  return {
    fontFamily: fontFamily || 'MiSans, Arial, sans-serif',
    fontSize: numberValue(content.fontSize, 18),
    fontWeight: content.bold === true ? 700 : 400,
    fontStyle: content.italic === true ? 'italic' : 'normal',
    color: resolveColor(content.color, theme),
    backgroundColor: content.backgroundColor
      ? resolveColor(content.backgroundColor, theme)
      : undefined,
    lineHeight:
      typeof content.lineHeightPx === 'number'
        ? `${content.lineHeightPx}px`
        : numberValue(content.lineHeight, 1),
    letterSpacing: numberValue(content.letterSpacing, 0),
    textAlign: (align[0] === 'distributed' ? 'justify' : align[0]) as CSSProperties['textAlign'],
    whiteSpace: content.wrap === false ? 'pre' : 'pre-wrap',
    overflowWrap: content.wrap === false ? 'normal' : 'break-word',
    writingMode: content.textDirection === 'vertical' ? 'vertical-rl' : undefined,
    width: '100%',
    margin: 0,
    padding: 0,
  };
}

const ALLOWED_TAGS = new Set([
  'p',
  'span',
  'strong',
  'em',
  'u',
  's',
  'sup',
  'sub',
  'a',
  'ul',
  'ol',
  'li',
  'br',
]);
const DROP_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'svg',
  'img',
  'annotation-xml',
]);
const MATH_TAGS = new Set([
  'math',
  'mrow',
  'mi',
  'mn',
  'mo',
  'mtext',
  'mspace',
  'ms',
  'msup',
  'msub',
  'msubsup',
  'mfrac',
  'msqrt',
  'mroot',
  'mover',
  'munder',
  'munderover',
  'mtable',
  'mtr',
  'mtd',
  'mmultiscripts',
  'mprescripts',
  'none',
  'semantics',
  'annotation',
  'menclose',
  'mpadded',
  'mphantom',
]);
const MATH_ATTRIBUTES = new Set([
  'xmlns',
  'display',
  'mathvariant',
  'mathsize',
  'mathcolor',
  'mathbackground',
  'stretchy',
  'fence',
  'separator',
  'symmetric',
  'largeop',
  'movablelimits',
  'accent',
  'accentunder',
  'columnalign',
  'rowalign',
  'columnspacing',
  'rowspacing',
  'columnspan',
  'rowspan',
  'linethickness',
  'notation',
  'width',
  'height',
  'depth',
  'lspace',
  'rspace',
  'voffset',
  'encoding',
]);
const STYLE_KEYS = new Set([
  'color',
  'background-color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
  'line-height',
  'letter-spacing',
  'margin-top',
  'margin-left',
  'margin-right',
  'list-style-type',
  'list-style-position',
]);

export function isRichText(text: string): boolean {
  return /<\/?(?:p|span|strong|b|em|i|u|s|sup|sub|a|ul|ol|li|br|math)(?:\s|>|\/)/i.test(text);
}

export function sanitizeRichTextHtml(source: string): string {
  const document = new DOMParser().parseFromString(source, 'text/html');
  const clean = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      const tag = child.tagName.toLowerCase();
      if (DROP_TAGS.has(tag)) {
        child.remove();
        continue;
      }
      clean(child);
      if (tag === 'b' || tag === 'i' || tag === 'div') {
        const replacement = document.createElement(
          tag === 'b' ? 'strong' : tag === 'i' ? 'em' : 'p',
        );
        replacement.append(...child.childNodes);
        child.replaceWith(replacement);
        continue;
      }
      if (!ALLOWED_TAGS.has(tag) && !MATH_TAGS.has(tag)) {
        child.replaceWith(...child.childNodes);
        continue;
      }
      for (const attribute of Array.from(child.attributes)) {
        if (attribute.name === 'style') {
          const declarations = attribute.value
            .split(';')
            .map((entry) => {
              const colon = entry.indexOf(':');
              if (colon < 0) return '';
              const name = entry.slice(0, colon).trim().toLowerCase();
              const value = entry.slice(colon + 1).trim();
              return STYLE_KEYS.has(name) && !/url\s*\(|expression\s*\(|javascript:/i.test(value)
                ? `${name}:${value}`
                : '';
            })
            .filter(Boolean);
          if (declarations.length) child.setAttribute('style', declarations.join(';'));
          else child.removeAttribute('style');
        } else if (
          !(
            tag === 'a' &&
            attribute.name === 'href' &&
            /^(https?:|mailto:)/i.test(attribute.value)
          ) &&
          !(
            MATH_TAGS.has(tag) &&
            MATH_ATTRIBUTES.has(attribute.name.toLowerCase()) &&
            !/url\s*\(|javascript:/i.test(attribute.value)
          )
        ) {
          child.removeAttribute(attribute.name);
        }
      }
      if (tag === 'a') child.setAttribute('rel', 'noopener noreferrer');
      if (tag === 'math') child.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');
    }
  };
  clean(document.body);
  return document.body.innerHTML;
}

function MathFragmentContent({ source, display }: { source: string; display: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    try {
      katex.render(source, container, {
        output: 'mathml',
        displayMode: display,
        trust: false,
        throwOnError: true,
      });
      delete container.dataset.hdFormulaError;
    } catch {
      container.textContent = source;
      container.dataset.hdFormulaError = 'true';
    }
  }, [source, display]);
  return <span ref={ref} data-hd-formula style={{ display: display ? 'block' : 'inline' }} />;
}

function MathmlContent({ source }: { source: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const clean = sanitizeRichTextHtml(source);
    const parsed = new DOMParser().parseFromString(clean, 'text/html');
    if (ref.current) ref.current.replaceChildren(...Array.from(parsed.body.childNodes));
  }, [source]);
  return <span ref={ref} data-hd-formula />;
}

function mathNodes(source: string, key: string): ReactNode {
  const fragments = splitMathFragments(source);
  if (fragments.every((fragment) => fragment.kind === 'text')) return source;
  let offset = 0;
  return fragments.map((fragment) => {
    const fragmentKey = key.concat('-', String(offset));
    offset += fragment.raw.length;
    if (fragment.kind === 'text') return <Fragment key={fragmentKey}>{fragment.value}</Fragment>;
    return (
      <MathFragmentContent key={fragmentKey} source={fragment.value} display={fragment.display} />
    );
  });
}

function richNodes(source: string, theme: PptdTheme): ReactNode {
  if (!isRichText(source)) return mathNodes(source, 'plain');
  const document = new DOMParser().parseFromString(sanitizeRichTextHtml(source), 'text/html');
  const render = (node: Node, key: string): ReactNode => {
    if (node.nodeType === 3) return mathNodes(node.textContent ?? '', key);
    if (!(node instanceof Element)) return null;
    const children = Array.from(node.childNodes).map((child, index) =>
      render(child, `${key}-${index}`),
    );
    const style: Record<string, string | number> = {};
    for (const declaration of (node.getAttribute('style') ?? '').split(';')) {
      const colon = declaration.indexOf(':');
      if (colon < 0) continue;
      const name = declaration.slice(0, colon).trim();
      const value = declaration.slice(colon + 1).trim();
      const prop = name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
      style[prop] = value.startsWith('$') ? resolveColor(value, theme) : value;
    }
    switch (node.tagName.toLowerCase()) {
      case 'math':
        return <MathmlContent key={key} source={node.outerHTML} />;
      case 'p':
        return (
          <p key={key} style={{ margin: 0, minHeight: '1em', ...style }}>
            {children}
          </p>
        );
      case 'span':
        return (
          <span key={key} style={style}>
            {children}
          </span>
        );
      case 'strong':
        return <strong key={key}>{children}</strong>;
      case 'em':
        return <em key={key}>{children}</em>;
      case 'u':
        return <u key={key}>{children}</u>;
      case 's':
        return <s key={key}>{children}</s>;
      case 'sup':
        return <sup key={key}>{children}</sup>;
      case 'sub':
        return <sub key={key}>{children}</sub>;
      case 'br':
        return <br key={key} />;
      case 'ul':
        return (
          <ul
            key={key}
            style={{ paddingLeft: '1.3em', margin: 0, listStyleType: 'disc', ...style }}
          >
            {children}
          </ul>
        );
      case 'ol':
        return (
          <ol
            key={key}
            style={{ paddingLeft: '1.3em', margin: 0, listStyleType: 'decimal', ...style }}
          >
            {children}
          </ol>
        );
      case 'li':
        return (
          <li key={key} style={style}>
            {children}
          </li>
        );
      case 'a':
        return (
          <a
            key={key}
            href={node.getAttribute('href') ?? undefined}
            tabIndex={-1}
            style={{ color: '#2563eb', textDecoration: 'underline' }}
            onClick={(event) => event.preventDefault()}
          >
            {children}
          </a>
        );
      default:
        return <Fragment key={key}>{children}</Fragment>;
    }
  };
  return Array.from(document.body.childNodes).map((node, index) => render(node, String(index)));
}

function fillCss(fill: unknown, theme: PptdTheme): CSSProperties {
  if (typeof fill === 'string')
    return { backgroundColor: resolveColor(fill, theme, 'transparent') };
  const value = record(fill);
  if (value.type === 'solid')
    return { backgroundColor: resolveColor(value.color, theme, 'transparent') };
  if (value.type === 'gradient' && Array.isArray(value.stops)) {
    const stops = value.stops.map((stop) => {
      const item = record(stop);
      return `${resolveColor(item.color, theme)} ${numberValue(item.position, 0) * 100}%`;
    });
    return {
      backgroundImage:
        value.gradientType === 'radial'
          ? `radial-gradient(${stops.join(',')})`
          : `linear-gradient(${numberValue(value.angle, 0) + 90}deg,${stops.join(',')})`,
    };
  }
  return {};
}

function ImageContent({
  element,
  assetUrl,
}: {
  element: PptdElement;
  assetUrl: (path: string) => string;
}) {
  const src = textValue(element.src);
  const url = src ? assetUrl(src) : '';
  const [natural, setNatural] = useState<{ src: string; width: number; height: number } | null>(
    null,
  );
  const [failed, setFailed] = useState<string | null>(null);
  const crop = record(element.crop);
  const mode = textValue(record(element.fit).mode, 'cover');
  const [, , width = 1, height = 1] = element.bounds ?? [];
  const cropLeft = numberValue(crop.left, 0);
  const cropRight = numberValue(crop.right, 0);
  const cropTop = numberValue(crop.top, 0);
  const cropBottom = numberValue(crop.bottom, 0);
  const valid = cropLeft + cropRight < 1 && cropTop + cropBottom < 1;
  let style: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: mode as CSSProperties['objectFit'],
  };
  if (natural?.src === url && valid) {
    const sourceWidth = natural.width * (1 - cropLeft - cropRight);
    const sourceHeight = natural.height * (1 - cropTop - cropBottom);
    const scale =
      mode === 'contain'
        ? Math.min(width / sourceWidth, height / sourceHeight)
        : Math.max(width / sourceWidth, height / sourceHeight);
    const scaleX = mode === 'fill' ? width / sourceWidth : scale;
    const scaleY = mode === 'fill' ? height / sourceHeight : scale;
    style = {
      position: 'absolute',
      maxWidth: 'none',
      width: natural.width * scaleX,
      height: natural.height * scaleY,
      left: (width - sourceWidth * scaleX) / 2 - cropLeft * natural.width * scaleX,
      top: (height - sourceHeight * scaleY) / 2 - cropTop * natural.height * scaleY,
    };
  }
  const shapeDefinition = record(element.cropShape);
  const shape = textValue(shapeDefinition.shapeName);
  if (!['', 'rect', 'roundRect', 'ellipse'].includes(shape))
    return <Unsupported label={`图片蒙版暂未渲染：${shape}`} detail={src} />;
  const radius = Array.isArray(shapeDefinition.adjustments)
    ? numberValue(shapeDefinition.adjustments[0], 16667) / 100000
    : 0.16667;
  if (!url || failed === url || !valid)
    return <Unsupported label={!valid ? '裁切范围无效' : '图片无法读取'} detail={src} />;
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius:
          shape === 'ellipse'
            ? '50%'
            : shape === 'roundRect'
              ? Math.min(width, height) * radius
              : undefined,
      }}
    >
      <img
        src={url}
        alt={textValue(element.alt, src)}
        draggable={false}
        style={style}
        onLoad={(event) =>
          setNatural({
            src: url,
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })
        }
        onError={() => setFailed(url)}
      />
    </div>
  );
}

const SHAPES = new Set([...SHAPE_PRESETS.map(([name]) => name), 'custom']);

function ShapeContent({ element, theme }: { element: PptdElement; theme: PptdTheme }) {
  const name = textValue(element.shapeName, 'rect');
  const id = useId().replace(/:/g, '');
  if (!SHAPES.has(name)) return <Unsupported label={`形状暂未渲染：${name}`} />;
  const width = element.bounds?.[2] || 1;
  const height = element.bounds?.[3] || 1;
  const viewBox =
    name === 'custom' && Array.isArray(element.viewBox) ? element.viewBox : [width, height];
  const fill = record(element.fill);
  if (fill.type && !['solid', 'gradient'].includes(String(fill.type)))
    return <Unsupported label={`形状填充暂未渲染：${fill.type}`} />;
  if (name === 'custom' && (!element.path || !element.viewBox))
    return <Unsupported label="自定义路径缺少 path 或 viewBox" />;
  const border = record(element.border);
  const gradient = fill.type === 'gradient' && Array.isArray(fill.stops);
  const Gradient = fill.gradientType === 'radial' ? 'radialGradient' : 'linearGradient';
  const props = {
    fill: gradient
      ? `url(#${id})`
      : fill.type === 'solid'
        ? resolveColor(fill.color, theme)
        : 'none',
    stroke: border.color ? resolveColor(border.color, theme) : 'none',
    strokeWidth: numberValue(border.width, 1),
    strokeDasharray: border.style === 'dash' ? '6 4' : border.style === 'dot' ? '1 3' : undefined,
    vectorEffect: 'non-scaling-stroke' as const,
  };
  let shape: ReactNode;
  const presetPath = presetShapePath(name, width, height);
  if (name === 'custom') shape = <path d={textValue(element.path)} {...props} />;
  else if (presetPath) shape = <path d={presetPath} {...props} />;
  else if (name === 'ellipse')
    shape = <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} {...props} />;
  else if (name === 'triangle')
    shape = <polygon points={`${width / 2},0 ${width},${height} 0,${height}`} {...props} />;
  else if (name === 'diamond')
    shape = (
      <polygon
        points={`${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`}
        {...props}
      />
    );
  else if (name === 'rightArrow' || name === 'leftArrow')
    shape = (
      <path
        d={`M0 ${height * 0.25} H${width * 0.6} V0 L${width} ${height / 2} L${width * 0.6} ${height} V${height * 0.75} H0 Z`}
        transform={name === 'leftArrow' ? `translate(${width},0) scale(-1,1)` : undefined}
        {...props}
      />
    );
  else if (name === 'chevron')
    shape = (
      <polygon
        points={`0,0 ${width * 0.65},0 ${width},${height / 2} ${width * 0.65},${height} 0,${height} ${width * 0.35},${height / 2}`}
        {...props}
      />
    );
  else {
    const adjustment = Array.isArray(element.adjustments)
      ? numberValue(element.adjustments[0], 16667) / 100000
      : 0.16667;
    shape = (
      <rect
        width={width}
        height={height}
        rx={name === 'roundRect' ? Math.min(width, height) * adjustment : 0}
        {...props}
      />
    );
  }
  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="100%"
      viewBox={`0 0 ${viewBox[0]} ${viewBox[1]}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      {gradient && (
        <defs>
          <Gradient id={id} gradientTransform={`rotate(${numberValue(fill.angle, 0)},0.5,0.5)`}>
            {(fill.stops as unknown[]).map((stop) => (
              <stop
                key={`${record(stop).position}-${record(stop).color}`}
                offset={`${numberValue(record(stop).position, 0) * 100}%`}
                stopColor={resolveColor(record(stop).color, theme)}
              />
            ))}
          </Gradient>
        </defs>
      )}
      {shape}
    </svg>
  );
}

function LineContent({ element, theme }: { element: PptdElement; theme: PptdTheme }) {
  const id = useId().replace(/:/g, '');
  const points = textValue(element.points, '0,0 1,1')
    .trim()
    .split(/\s+/)
    .map((point) => point.split(',').map(Number));
  const viewBox = Array.isArray(element.viewBox) ? element.viewBox : [1, 1];
  const border = record(element.border);
  const arrow = Array.isArray(element.arrow) ? element.arrow : [];
  if (
    arrow.some((value) => value && !['arrow', 'stealth', 'diamond', 'oval'].includes(String(value)))
  )
    return <Unsupported label="线条箭头类型暂未支持" />;
  const color = resolveColor(border.color, theme);
  let path = `M${points[0]?.join(',')}`;
  if (element.curve === 'smooth' && points.length === 4)
    path += ` C${points
      .slice(1)
      .map((point) => point.join(','))
      .join(' ')}`;
  else if (element.curve === 'smooth' && points.length === 3)
    path += ` Q${points
      .slice(1)
      .map((point) => point.join(','))
      .join(' ')}`;
  else
    path += points
      .slice(1)
      .map((point) => ` L${point.join(',')}`)
      .join('');
  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="100%"
      viewBox={`0 0 ${viewBox[0] || 1} ${viewBox[1] || 1}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {(['start', 'end'] as const).map((end, index) => (
          <marker
            key={end}
            id={`${id}-${end}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            {arrow[index] === 'oval' ? (
              <circle cx="5" cy="5" r="4.5" fill={color} />
            ) : (
              <path
                d={
                  arrow[index] === 'diamond'
                    ? 'M0 5 L5 0 L10 5 L5 10 Z'
                    : arrow[index] === 'stealth'
                      ? 'M0 0 L10 5 L0 10 L3 5 Z'
                      : 'M0 0 L10 5 L0 10 Z'
                }
                fill={color}
              />
            )}
          </marker>
        ))}
      </defs>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={numberValue(border.width, 1)}
        strokeLinejoin={element.curve === 'sharp' ? 'miter' : 'round'}
        strokeDasharray={
          border.style === 'dash' ? '6 4' : border.style === 'dot' ? '1 3' : undefined
        }
        markerStart={arrow[0] ? `url(#${id}-start)` : undefined}
        markerEnd={arrow[1] ? `url(#${id}-end)` : undefined}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Unsupported({ label, detail }: { label: string; detail?: string }) {
  return (
    <div
      data-hd-unsupported="true"
      data-pptd-unsupported="true"
      style={{
        width: '100%',
        height: '100%',
        border: '1px dashed #d97706',
        background: '#fffbeb',
        color: '#92400e',
        font: '13px Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 8,
      }}
    >
      <span>{label}</span>
      {detail && <span style={{ fontSize: 10, overflowWrap: 'anywhere' }}>{detail}</span>}
    </div>
  );
}

function TextContent({ element, theme }: { element: PptdElement; theme: PptdTheme }) {
  const content = textContent(element, theme);
  const source = textValue(content.text);
  const children = useMemo(() => richNodes(source, theme), [source, theme]);
  const align = Array.isArray(content.align) ? content.align : ['left', 'top'];
  const unsupported = !!content.gradient || !!content.shadow;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems:
          align[1] === 'middle' ? 'center' : align[1] === 'bottom' ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={textCss(content, theme)}
        data-hd-unsupported={unsupported ? 'true' : undefined}
        data-pptd-unsupported={unsupported ? 'true' : undefined}
      >
        {children}
      </div>
    </div>
  );
}

function TableContent({ element, theme }: { element: PptdElement; theme: PptdTheme }) {
  let layout: ReturnType<typeof tableLayout>;
  let styles: ReturnType<typeof resolveTableCellStyle>[][];
  try {
    layout = tableLayout(element);
    styles = layout.grid.map((slots, row) =>
      slots.map((slot, column) =>
        resolveTableCellStyle(theme, element, slot.cell, {
          row,
          column,
          rowCount: layout.grid.length,
          columnCount: layout.colCount,
        }),
      ),
    );
  } catch (error) {
    return (
      <Unsupported
        label="表格无法渲染"
        detail={error instanceof Error ? error.message : '表格数据无效'}
      />
    );
  }
  const borderCss = (border: Record<string, unknown> | null) =>
    border === null
      ? 'none'
      : `${numberValue(border.width, 1)}px ${border.style === 'dash' ? 'dashed' : border.style === 'dot' ? 'dotted' : 'solid'} ${resolveColor(border.color, theme, '#999999')}`;
  return (
    <table
      data-hd-table
      style={{
        width: '100%',
        height: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        fontSize: 13,
        overflow: 'visible',
      }}
    >
      <colgroup>
        {layout.columnRatios.map((fraction, index) => (
          <col key={String(index)} style={{ width: `${fraction * 100}%` }} />
        ))}
      </colgroup>
      <tbody>
        {layout.grid.map((slots, row) => (
          <tr key={slots[0]?.row} style={{ height: layout.rowMinimums[row] }}>
            {slots.map((slot, column) => {
              if (slot.covered) return null;
              const final = styles[row][column];
              return (
                <td
                  key={`${slot.row}:${slot.column}`}
                  data-hd-table-cell={`${row}:${column}`}
                  rowSpan={slot.rowSpan}
                  colSpan={slot.colSpan}
                  style={{
                    borderTop: borderCss(final.borders.top),
                    borderRight: borderCss(final.borders.right),
                    borderBottom: borderCss(final.borders.bottom),
                    borderLeft: borderCss(final.borders.left),
                    ...fillCss(final.fill, theme),
                    padding: `${TABLE_CELL_PADDING_Y}px ${TABLE_CELL_PADDING_X}px`,
                    verticalAlign:
                      final.align[1] === 'middle'
                        ? 'middle'
                        : final.align[1] === 'bottom'
                          ? 'bottom'
                          : 'top',
                  }}
                >
                  <div style={textCss(final.text, theme)}>
                    {richNodes(textValue(final.text.text), theme)}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type PptdPageRendererProps = {
  page: PageSnapshot;
  size: PageSize;
  theme?: PptdTheme;
  assetUrl?: (path: string) => string;
  onElementPointerDown?: (element: PptdElement, event: ReactPointerEvent<HTMLDivElement>) => void;
  onElementDoubleClick?: (element: PptdElement) => void;
  onElementFocus?: (elementId: string) => void;
  renderContent?: (element: PptdElement) => ReactNode | undefined;
};

const EMPTY_THEME: PptdTheme = {};

export function PptdPageRenderer({
  page,
  size,
  theme: inheritedTheme = EMPTY_THEME,
  assetUrl = pptdAssetUrl,
  onElementPointerDown,
  onElementDoubleClick,
  onElementFocus,
  renderContent,
}: PptdPageRendererProps) {
  const theme =
    page.metadata.themeOverride &&
    typeof page.metadata.themeOverride === 'object' &&
    !Array.isArray(page.metadata.themeOverride)
      ? (page.metadata.themeOverride as PptdTheme)
      : inheritedTheme;
  const background = record(page.data.background);
  const resolveAsset = useMemo(
    () => (source: string) => {
      const url = assetUrl(source);
      return url.startsWith('/')
        ? `${url}${url.includes('?') ? '&' : '?'}revision=${encodeURIComponent(page.renderRevision)}`
        : url;
    },
    [assetUrl, page.renderRevision],
  );
  return (
    <div
      data-pptd-page={page.pageId}
      data-hd-page-id={page.pageId}
      style={{
        width: size[0],
        height: size[1],
        position: 'relative',
        backgroundColor: '#ffffff',
        ...fillCss(background, theme),
        isolation: 'isolate',
      }}
    >
      {background.type === 'image' && (
        <div
          style={{ position: 'absolute', inset: 0, opacity: numberValue(background.opacity, 1) }}
        >
          <ImageContent
            element={{
              ...background,
              elementId: 'background',
              elementType: 'image',
              bounds: [0, 0, ...size],
            }}
            assetUrl={resolveAsset}
          />
        </div>
      )}
      {page.data.elements.map((element) => {
        if (element.elementType === 'group' && !onElementPointerDown) return null;
        const [x, y, width, height] = element.bounds ?? [0, 0, 120, 50];
        const flip = Array.isArray(element.flip) ? element.flip : [];
        const shadow = record(element.shadow);
        const offset = Array.isArray(shadow.offset) ? shadow.offset : [0, 0];
        let content = renderContent?.(element);
        if (content === undefined) {
          if (element.elementType === 'text')
            content = <TextContent element={element} theme={theme} />;
          else if (element.elementType === 'image')
            content = <ImageContent element={element} assetUrl={resolveAsset} />;
          else if (element.elementType === 'shape')
            content = <ShapeContent element={element} theme={theme} />;
          else if (element.elementType === 'line')
            content = <LineContent element={element} theme={theme} />;
          else if (element.elementType === 'table')
            content = <TableContent element={element} theme={theme} />;
          else if (element.elementType === 'chart')
            content = <ChartContent element={element} theme={theme} />;
          else if (element.elementType === 'icon')
            content = <IconContent element={element} theme={theme} />;
          else if (element.elementType === 'group') content = null;
          else
            content = (
              <Unsupported label={`暂未渲染：${element.elementType}`} detail={element.elementId} />
            );
        }
        const frameProps = {
          'data-hd-page-id': page.pageId,
          'data-hd-element-id': element.elementId,
          style: {
            position: 'absolute',
            left: x,
            top: y,
            width,
            height,
            transform: `rotate(${numberValue(element.rotation, 0)}deg) scale(${flip[0] ? -1 : 1},${flip[1] ? -1 : 1})`,
            transformOrigin: 'center',
            opacity: numberValue(element.opacity, 1),
            outline: 'none',
            cursor: onElementPointerDown ? 'move' : undefined,
            touchAction: onElementPointerDown ? 'none' : undefined,
            filter: shadow.color
              ? `drop-shadow(${offset[0]}px ${offset[1]}px ${numberValue(shadow.blur, 0)}px ${resolveColor(shadow.color, theme)})`
              : undefined,
          } as CSSProperties,
        };
        if (!onElementPointerDown)
          return (
            <div key={element.elementId} {...frameProps}>
              {content}
            </div>
          );
        return (
          // biome-ignore lint/a11y/useSemanticElements: Selectable canvas frames contain rich text and other block content.
          <div
            key={element.elementId}
            {...frameProps}
            role="button"
            tabIndex={0}
            aria-label={`${element.elementType} ${element.elementId}`}
            onPointerDown={(event) => onElementPointerDown(element, event)}
            onDoubleClick={onElementDoubleClick ? () => onElementDoubleClick(element) : undefined}
            onFocus={onElementFocus ? () => onElementFocus(element.elementId) : undefined}
            onKeyDown={
              onElementDoubleClick
                ? (event) => {
                    if (event.key === 'Enter' && event.target === event.currentTarget)
                      onElementDoubleClick(element);
                  }
                : undefined
            }
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
