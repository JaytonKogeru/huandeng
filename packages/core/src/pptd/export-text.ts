import type { Rgba } from '../app/lib/pptx/css';
import { escapeXml } from '../app/lib/pptx/ooxml';
import type { Paragraph, RunStyle, TextLine, TextNode } from '../app/lib/pptx/scene';
import {
  ExportFeatureError,
  elementBounds,
  exportNumber,
  exportRecord,
  sceneRect,
} from './export-images';
import { formulaRunXml, mathCompatibilityXml } from './export-math';
import { safeHyperlink } from './hyperlink';
import { splitMathFragments } from './math-fragments';
import type { PptdElement } from './types';

type ColorResolver = (value: unknown, alpha?: number) => Rgba;
type FontStyle = RunStyle & { eastAsianFont: string; mathXml?: string; hyperlink?: string };
export type TextHyperlinkResolver = (url: string) => string;

export interface NativeText {
  node: TextNode;
  wrap: 'none' | 'square';
  anchor: 't' | 'ctr' | 'b';
  eastAsianFonts: string[];
  fonts: string[];
  mathRuns: (string | null)[];
  mathLineSpacing: (number | null)[];
  hyperlinks: (string | null)[];
}

function fontNames(value: unknown): { latin: string; ea: string } {
  if (typeof value === 'string') {
    const font = value
      .split(',')[0]
      .trim()
      .replace(/^['"]|['"]$/g, '');
    return { latin: font || 'MiSans', ea: font || 'MiSans' };
  }
  const fonts = exportRecord(value);
  const latin = typeof fonts.latin === 'string' ? fonts.latin : 'MiSans';
  return { latin, ea: typeof fonts.ea === 'string' ? fonts.ea : latin };
}

function inlineStyle(
  content: Record<string, unknown>,
  color: ColorResolver,
  opacity: number,
): FontStyle {
  const size = exportNumber(content.fontSize, 18, 'fontSize');
  if (size <= 0) throw new ExportFeatureError('INVALID_FONT_SIZE', 'Font size must be positive.');
  const fonts = fontNames(content.fontFamily);
  return {
    font: fonts.latin,
    eastAsianFont: fonts.ea,
    sizePx: size * 2,
    bold: content.bold === true,
    italic: content.italic === true,
    underline: content.underline === true,
    strike: false,
    color: color(content.color ?? '#000000', opacity),
    letterSpacingPx: exportNumber(content.letterSpacing, 0, 'letterSpacing') * 2,
    baselineShift: null,
    shadow: null,
    outline: null,
  };
}

function alignment(value: unknown): Paragraph['align'] {
  if (value === undefined || value === 'left') return 'l';
  if (value === 'center') return 'ctr';
  if (value === 'right') return 'r';
  if (value === 'justify' || value === 'distributed') return 'just';
  throw new ExportFeatureError(
    'UNSUPPORTED_TEXT_ALIGNMENT',
    `Text alignment ${String(value)} needs a rendered fallback.`,
  );
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: '\u00a0',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (_match, name: string) => {
    if (name.startsWith('#')) {
      const code =
        name[1].toLowerCase() === 'x'
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10);
      if (code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff))
        return String.fromCodePoint(code);
    } else if (Object.hasOwn(named, name)) return named[name];
    throw new ExportFeatureError(
      'UNSUPPORTED_TEXT_ENTITY',
      `Entity &${name}; needs browser rendering.`,
    );
  });
}

function cssProperties(attributes: string): Record<string, string> {
  const style = attributes.match(/^\s*style\s*=\s*(?:"([^"]*)"|'([^']*)')\s*$/i);
  if (attributes.trim() && !style) {
    throw new ExportFeatureError(
      'UNSUPPORTED_TEXT_ATTRIBUTES',
      'Rich text contains attributes outside the native export subset.',
    );
  }
  const properties: Record<string, string> = {};
  for (const declaration of (style?.[1] ?? style?.[2] ?? '').split(';')) {
    if (!declaration.trim()) continue;
    const colon = declaration.indexOf(':');
    if (colon < 1)
      throw new ExportFeatureError('INVALID_TEXT_STYLE', 'Invalid rich text style declaration.');
    properties[declaration.slice(0, colon).trim().toLowerCase()] = declaration
      .slice(colon + 1)
      .trim();
  }
  return properties;
}

function anchorAttributes(attributes: string): {
  url: string | null;
  properties: Record<string, string>;
} {
  let url: string | null = null;
  let style = '';
  const seen = new Set<string>();
  const remaining = attributes.replace(
    /\s+([a-z][a-z\d-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    (attribute, rawName: string, quoted: string | undefined, single: string | undefined) => {
      const name = rawName.toLowerCase();
      if (seen.has(name) || !['href', 'style'].includes(name)) {
        throw new ExportFeatureError(
          'UNSUPPORTED_TEXT_ATTRIBUTES',
          'Links accept one href and an optional inline style.',
        );
      }
      seen.add(name);
      if (name === 'href') url = safeHyperlink(decodeEntities(quoted ?? single ?? ''));
      else style = attribute;
      return '';
    },
  );
  if (remaining.trim())
    throw new ExportFeatureError('UNSUPPORTED_TEXT_ATTRIBUTES', 'Invalid link attributes.');
  return { url, properties: cssProperties(style) };
}

function cssPixels(value: string, name: string): number {
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px)?$/.test(value)) {
    throw new ExportFeatureError(
      'UNSUPPORTED_TEXT_STYLE',
      `${name} requires a finite pixel value.`,
    );
  }
  return Number.parseFloat(value);
}

export function mapPptdText(
  element: PptdElement,
  theme: Record<string, unknown>,
  color: ColorResolver,
  name: string,
): NativeText {
  const own = exportRecord(element.content);
  const styleName = typeof own.style === 'string' ? own.style.replace(/^\$/, '') : '';
  const themeStyle = styleName ? exportRecord(exportRecord(theme.textStyles)[styleName]) : {};
  if (styleName && !Object.hasOwn(exportRecord(theme.textStyles), styleName)) {
    throw new ExportFeatureError(
      'UNRESOLVED_TEXT_STYLE',
      `Theme text style ${styleName} does not exist.`,
    );
  }
  const content = { ...themeStyle, ...own };
  if (typeof content.text !== 'string')
    throw new ExportFeatureError('INVALID_TEXT', 'Text content must be a string.');
  if (
    content.gradient ||
    content.shadow ||
    content.backgroundColor ||
    content.textDirection === 'vertical'
  ) {
    throw new ExportFeatureError(
      'UNSUPPORTED_TEXT_EFFECT',
      'This text effect needs browser rendering.',
    );
  }
  if (exportNumber(content.marginTop, 0, 'marginTop') !== 0) {
    throw new ExportFeatureError(
      'UNSUPPORTED_PARAGRAPH_SPACING',
      'Paragraph top margins need browser rendering.',
    );
  }
  if (/<\s*(math|svg)\b/i.test(content.text)) {
    throw new ExportFeatureError(
      'FORMULA_REQUIRES_RENDERER',
      'Formula content must be rendered without changing its scientific source.',
    );
  }
  const opacity = exportNumber(element.opacity, 1, 'opacity');
  if (opacity < 0 || opacity > 1)
    throw new ExportFeatureError('INVALID_OPACITY', 'Opacity must be between zero and one.');
  const base = inlineStyle(content, color, opacity);
  const align = Array.isArray(content.align) ? content.align : ['left', 'top'];
  const lineSpacing =
    content.lineHeightPx === undefined
      ? base.sizePx * exportNumber(content.lineHeight, 1, 'lineHeight')
      : exportNumber(content.lineHeightPx, 18, 'lineHeightPx') * 2;
  if (lineSpacing <= 0)
    throw new ExportFeatureError('INVALID_LINE_HEIGHT', 'Line height must be positive.');
  const paragraphs: Paragraph[] = [];
  const fonts = new Set([base.font, base.eastAsianFont]);
  let current: Paragraph | null = null;
  const stack: { tag: string; style: FontStyle }[] = [{ tag: '', style: base }];
  const newParagraph = (): Paragraph => ({
    lineSpacingPx: lineSpacing,
    lines: [{ runs: [], sizePx: base.sizePx }],
    align: alignment(align[0]),
    bullet: null,
    marginLeftPx: 0,
    indentPx: 0,
    endSizePx: base.sizePx,
  });
  const finish = () => {
    if (current) paragraphs.push(current);
    current = null;
  };
  const appendRun = (text: string, style: FontStyle) => {
    current ??= newParagraph();
    const line = current.lines[current.lines.length - 1];
    line.runs.push({ text, style: { ...style } });
    line.sizePx = Math.max(line.sizePx, style.sizePx);
    current.endSizePx = style.sizePx;
    fonts.add(style.font);
    fonts.add(style.eastAsianFont);
  };

  let markerPrefix = '\uE000HUANDENGMATH';
  while (content.text.includes(markerPrefix)) markerPrefix += '_';
  const formulas = new Map<string, { source: string; raw: string; display: boolean }>();
  const prepared = splitMathFragments(content.text)
    .map((fragment) => {
      if (fragment.kind === 'text') return fragment.value;
      const marker = `${markerPrefix}${formulas.size}\uE001`;
      formulas.set(marker, {
        source: fragment.value,
        raw: fragment.raw,
        display: fragment.display,
      });
      return marker;
    })
    .join('');
  const richText = /<\/?[a-z][^>]*>/i.test(prepared);
  const markerPattern = new RegExp(`(${markerPrefix}\\d+\uE001)`, 'g');
  const append = (text: string, style: FontStyle) => {
    for (const fragment of text.split(markerPattern)) {
      const formula = formulas.get(fragment);
      if (!formula) {
        if (fragment) appendRun(fragment, style);
        continue;
      }
      if (style.hyperlink)
        throw new ExportFeatureError(
          'UNSUPPORTED_LINKED_EQUATION',
          'A hyperlink around an equation requires rendered export.',
        );
      if (formula.display && current) finish();
      const mathXml = formulaRunXml(
        richText ? decodeEntities(formula.source) : formula.source,
        formula.display,
        style,
        current?.align ?? alignment(align[0]),
      );
      appendRun(formula.raw, { ...style, mathXml });
      fonts.add('Cambria Math');
      if (formula.display) finish();
    }
  };

  if (!richText) {
    for (const text of prepared.split(/\r?\n/)) {
      append(text, base);
      if (!text) current ??= newParagraph();
      finish();
    }
  } else {
    const tokens = prepared.match(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+|</g) ?? [];
    for (const token of tokens) {
      if (token.startsWith('<!--')) continue;
      if (!token.startsWith('<')) {
        if (!current && !token.trim()) continue;
        append(decodeEntities(token), stack[stack.length - 1].style);
        continue;
      }
      const match = token.match(/^<(\/)?([a-z][a-z\d]*)([\s\S]*?)(\/?)>$/i);
      if (!match)
        throw new ExportFeatureError(
          'INVALID_RICH_TEXT',
          'Malformed rich text requires browser rendering.',
        );
      const [, closing, rawTag, attributes] = match;
      const tag = rawTag.toLowerCase();
      if (
        !['p', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'sup', 'sub', 'br', 'a'].includes(tag)
      ) {
        throw new ExportFeatureError(
          'UNSUPPORTED_RICH_TEXT',
          `Rich text tag <${tag}> needs browser rendering.`,
        );
      }
      if (closing) {
        if (stack.length < 2 || stack[stack.length - 1].tag !== tag) {
          throw new ExportFeatureError('INVALID_RICH_TEXT', 'Rich text tags are not balanced.');
        }
        stack.pop();
        if (tag === 'p') finish();
        continue;
      }
      const link = tag === 'a' ? anchorAttributes(attributes) : null;
      const properties = link?.properties ?? cssProperties(attributes);
      const style = { ...stack[stack.length - 1].style };
      if (link) {
        if (stack.some((entry) => entry.tag === 'a'))
          throw new ExportFeatureError('INVALID_RICH_TEXT', 'Links cannot be nested.');
        delete style.hyperlink;
        if (link.url) style.hyperlink = link.url;
        style.color = color('#2563eb', opacity);
        style.underline = true;
      }
      if (tag === 'br') {
        current ??= newParagraph();
        const line: TextLine = { runs: [], sizePx: style.sizePx };
        current.lines.push(line);
        continue;
      }
      if (tag === 'p') {
        if (stack.length !== 1)
          throw new ExportFeatureError(
            'INVALID_RICH_TEXT',
            'Nested rich text paragraphs are unsupported.',
          );
        finish();
        current = newParagraph();
      }
      for (const [property, value] of Object.entries(properties)) {
        if (tag === 'p' && property === 'text-align' && current) current.align = alignment(value);
        else if (tag === 'p' && property === 'line-height' && current) {
          current.lineSpacingPx = value.endsWith('px')
            ? cssPixels(value, property) * 2
            : cssPixels(value, property) * style.sizePx;
          if (current.lineSpacingPx <= 0)
            throw new ExportFeatureError(
              'INVALID_LINE_HEIGHT',
              'Inline line height must be positive.',
            );
        } else if (tag === 'p' && property === 'margin-left' && current) {
          current.marginLeftPx = cssPixels(value, property) * 2;
        } else if (tag === 'p' && property === 'margin-top' && cssPixels(value, property) === 0) {
        } else if ((tag === 'span' || tag === 'a') && property === 'color')
          style.color = color(value, opacity);
        else if ((tag === 'span' || tag === 'a') && property === 'font-size') {
          style.sizePx = cssPixels(value, property) * 2;
          if (style.sizePx <= 0)
            throw new ExportFeatureError('INVALID_FONT_SIZE', 'Inline font size must be positive.');
        } else if (
          (tag === 'span' || tag === 'a') &&
          property === 'font-weight' &&
          ['normal', 'bold', '400', '700'].includes(value)
        ) {
          style.bold = value === 'bold' || value === '700';
        } else if ((tag === 'span' || tag === 'a') && property === 'font-family') {
          const family = fontNames(value);
          style.font = family.latin;
          style.eastAsianFont = family.ea;
        } else {
          throw new ExportFeatureError(
            'UNSUPPORTED_TEXT_STYLE',
            `Rich text style ${property} needs browser rendering.`,
          );
        }
      }
      if (tag === 'strong' || tag === 'b') style.bold = true;
      if (tag === 'em' || tag === 'i') style.italic = true;
      if (tag === 'u') style.underline = true;
      if (tag === 's') style.strike = true;
      if (tag === 'sup') style.baselineShift = 'super';
      if (tag === 'sub') style.baselineShift = 'sub';
      stack.push({ tag, style });
    }
    if (stack.length !== 1)
      throw new ExportFeatureError('INVALID_RICH_TEXT', 'Rich text tags are not balanced.');
    finish();
  }
  if (!paragraphs.length) paragraphs.push(newParagraph());
  const anchor = align[1] === 'middle' ? 'ctr' : align[1] === 'bottom' ? 'b' : 't';
  return {
    node: {
      kind: 'text',
      name,
      box: sceneRect(elementBounds(element)),
      rotationDeg: exportNumber(element.rotation, 0, 'rotation'),
      flipV: Array.isArray(element.flip) && element.flip[1] === true,
      paragraphs,
    },
    wrap: content.wrap === false ? 'none' : 'square',
    anchor,
    eastAsianFonts: paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) =>
        line.runs.map((run) => (run.style as FontStyle).eastAsianFont),
      ),
    ),
    fonts: [...fonts],
    hyperlinks: paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) =>
        line.runs.map((run) => (run.style as FontStyle).hyperlink ?? null),
      ),
    ),
    mathRuns: paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) =>
        line.runs.map((run) => (run.style as FontStyle).mathXml ?? null),
      ),
    ),
    mathLineSpacing: paragraphs.map((paragraph) =>
      paragraph.lines.some((line) =>
        line.runs.some((run) => Boolean((run.style as FontStyle).mathXml)),
      )
        ? Math.round(
            Math.max(
              1,
              paragraph.lineSpacingPx / Math.max(...paragraph.lines.map((line) => line.sizePx)),
            ) * 100000,
          )
        : null,
    ),
  };
}

export function decorateNativeTextXml(
  xml: string,
  text: NativeText,
  wrapShape = false,
  resolveLink?: TextHyperlinkResolver,
): string {
  const base = xml.replace(
    /<a:bodyPr\b[^>]*>/,
    `<a:bodyPr wrap="${text.wrap}" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="${text.anchor}">`,
  );
  let run = 0;
  const fallback = base.replace(/<a:r>[\s\S]*?<\/a:r>/g, (xmlRun) => {
    const eastAsian = text.eastAsianFonts[run];
    const url = text.hyperlinks[run++];
    let result = eastAsian
      ? xmlRun.replace(/<a:ea typeface="[^"]*"\/>/, `<a:ea typeface="${escapeXml(eastAsian)}"/>`)
      : xmlRun;
    // MS-ODRAWXML hlinkClr: Office must use the authored text fill, not the theme link color.
    if (url && resolveLink)
      result = result.replace(
        '</a:rPr>',
        `<a:hlinkClick r:id="${escapeXml(resolveLink(url))}"><a:extLst><a:ext uri="{A12FA001-AC4F-418D-AE19-62706E023703}"><ahyp:hlinkClr xmlns:ahyp="http://schemas.microsoft.com/office/drawing/2018/hyperlinkcolor" val="tx"/></a:ext></a:extLst></a:hlinkClick></a:rPr>`,
      );
    return result;
  });
  run = 0;
  let native = fallback.replace(
    /<a:r>[\s\S]*?<\/a:r>/g,
    (xmlRun) => text.mathRuns[run++] ?? xmlRun,
  );
  let paragraph = 0;
  native = native.replace(/<a:p>[\s\S]*?<\/a:p>/g, (xmlParagraph) => {
    const spacing = text.mathLineSpacing[paragraph++];
    // Fixed baseline spacing overlaps tall Office math with adjacent lines. Percent spacing lets
    // PowerPoint measure fractions, integrals and matrices while retaining the author's multiplier.
    return spacing === null || spacing === undefined
      ? xmlParagraph
      : xmlParagraph.replace(
          /<a:lnSpc>[\s\S]*?<\/a:lnSpc>/,
          `<a:lnSpc><a:spcPct val="${spacing}"/></a:lnSpc>`,
        );
  });
  return wrapShape && text.mathRuns.some(Boolean) ? mathCompatibilityXml(native, fallback) : native;
}
