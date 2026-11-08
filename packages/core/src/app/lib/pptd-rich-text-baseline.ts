export type RichTextBaselineField =
  | 'fontFamily'
  | 'fontSize'
  | 'color'
  | 'align'
  | 'lineHeight'
  | 'lineHeightPx'
  | 'letterSpacing';

const CSS_FIELDS: Record<string, RichTextBaselineField> = {
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  color: 'color',
  'text-align': 'align',
  'line-height': 'lineHeight',
  'letter-spacing': 'letterSpacing',
};
const TAGS = /<!--[\s\S]*?-->|<\/?[a-z][a-z\d]*(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
const ATTRIBUTES = /\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const STYLED_TAGS = new Set(['p', 'span', 'ul', 'ol', 'li']);
const IGNORED_TAGS = new Set([
  'math',
  'script',
  'style',
  'iframe',
  'object',
  'svg',
  'annotation-xml',
]);

function attributeStyle(token: string): string {
  for (const match of token.matchAll(ATTRIBUTES))
    if (match[1].toLowerCase() === 'style') return match[2] ?? match[3] ?? match[4] ?? '';
  return '';
}

function decode(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    nbsp: '\u00a0',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (raw, name: string) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()] ?? raw;
    const code =
      name[1].toLowerCase() === 'x'
        ? Number.parseInt(name.slice(2), 16)
        : Number.parseInt(name.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
      ? String.fromCodePoint(code)
      : raw;
  });
}

function declarations(style: string): [string, string][] {
  return decode(style)
    .split(';')
    .flatMap<[string, string]>((entry) => {
      const colon = entry.indexOf(':');
      if (colon < 1) return [];
      return [[entry.slice(0, colon).trim().toLowerCase(), entry.slice(colon + 1).trim()]];
    });
}

function clearRichTextProperties(source: string, selected: ReadonlySet<string>): string {
  let ignoredDepth = 0;
  return source.replace(TAGS, (token) => {
    const tag = token.match(/^<(\/)?([a-z][a-z\d-]*)/i);
    if (!tag) return token;
    const name = tag[2].toLowerCase();
    if (IGNORED_TAGS.has(name)) {
      if (tag[1]) ignoredDepth = Math.max(0, ignoredDepth - 1);
      else if (!/\/\s*>$/.test(token)) ignoredDepth += 1;
      return token;
    }
    if (ignoredDepth || tag[1] || !STYLED_TAGS.has(name)) return token;
    return token.replace(
      ATTRIBUTES,
      (
        attribute,
        key: string,
        double: string | undefined,
        single: string | undefined,
        bare: string | undefined,
      ) => {
        if (key.toLowerCase() !== 'style') return attribute;
        const original = double ?? single ?? bare ?? '';
        const decoded = decode(original);
        const kept = decoded.split(';').filter((entry) => {
          const colon = entry.indexOf(':');
          return colon < 0 || !selected.has(entry.slice(0, colon).trim().toLowerCase());
        });
        if (kept.join(';') === decoded) return attribute;
        const value = kept.filter((entry) => entry.trim()).join(';');
        if (!value) return '';
        const quote = double !== undefined ? '"' : single !== undefined ? "'" : '"';
        const escaped = value
          .replaceAll('&', '&amp;')
          .replaceAll(quote, quote === '"' ? '&quot;' : '&#39;');
        return ` style=${quote}${escaped}${quote}`;
      },
    );
  });
}

// Only remove requested baseline declarations. Text, entities, tags, and local emphasis stay intact.
export function clearRichTextBaseline(
  source: string,
  fields: readonly RichTextBaselineField[],
): string {
  const selected = new Set(fields);
  if (selected.has('lineHeightPx')) selected.add('lineHeight');
  return clearRichTextProperties(
    source,
    new Set(
      Object.entries(CSS_FIELDS)
        .filter(([, field]) => selected.has(field))
        .map(([property]) => property),
    ),
  );
}

export function clearUniformRichTextEmphasis(source: string): string {
  const properties = ['font-weight', 'font-style', 'text-decoration'];
  const runs: Record<string, string>[] = [];
  const stack: { tag: string; css: Record<string, string>; ignored: boolean }[] = [
    { tag: '', css: {}, ignored: false },
  ];
  let cursor = 0;
  const append = (text: string) => {
    const frame = stack[stack.length - 1];
    if (!frame.ignored && decode(text).trim()) runs.push(frame.css);
  };
  for (const token of source.matchAll(TAGS)) {
    append(source.slice(cursor, token.index));
    cursor = token.index + token[0].length;
    const match = token[0].match(/^<(\/)?([a-z][a-z\d-]*)/i);
    if (!match) continue;
    const tag = match[2].toLowerCase();
    if (match[1]) {
      const index = stack.map((frame) => frame.tag).lastIndexOf(tag);
      if (index > 0) stack.splice(index);
      continue;
    }
    if (['br', 'img', 'hr', 'input', 'link', 'meta'].includes(tag) || /\/\s*>$/.test(token[0]))
      continue;
    const parent = stack[stack.length - 1];
    const ignored = parent.ignored || IGNORED_TAGS.has(tag);
    const css = { ...parent.css };
    if (!ignored && STYLED_TAGS.has(tag)) {
      for (const [property, raw] of declarations(attributeStyle(token[0]))) {
        if (!properties.includes(property)) continue;
        const value = raw.trim().toLowerCase();
        css[property] =
          property === 'font-weight' && value === 'normal'
            ? '400'
            : property === 'font-weight' && value === 'bold'
              ? '700'
              : value;
      }
    }
    stack.push({ tag, css, ignored });
  }
  append(source.slice(cursor));
  const selected = new Set(
    properties.filter((property) => {
      const values = new Set(runs.map((run) => run[property]));
      const value = runs[0]?.[property];
      const supported =
        property === 'font-weight'
          ? ['400', '700']
          : property === 'font-style'
            ? ['normal', 'italic']
            : ['none', 'underline'];
      return values.size === 1 && typeof value === 'string' && supported.includes(value);
    }),
  );
  return clearRichTextProperties(source, selected);
}

function numeric(value: string, name: string, relative: number): number {
  const parsed = value.trim().match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(px|pt|em|%)?$/i);
  if (!parsed)
    throw new Error(
      `The reference title uses unsupported inline ${name}. Choose a title with a numeric base style.`,
    );
  const number = Number(parsed[1]);
  const unit = parsed[2]?.toLowerCase();
  const result =
    unit === 'pt'
      ? (number * 4) / 3
      : unit === 'em'
        ? number * relative
        : unit === '%'
          ? (number * relative) / 100
          : number;
  if (!Number.isFinite(result))
    throw new Error('The reference title contains an invalid inline text style.');
  return result;
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function styledContent(
  parent: Record<string, unknown>,
  tag: string,
  style: string,
  colors: Record<string, string>,
  fields: readonly RichTextBaselineField[],
): Record<string, unknown> {
  const result = { ...parent };
  if (tag === 'strong' || tag === 'b') result.bold = true;
  if (tag === 'em' || tag === 'i') result.italic = true;
  if (tag === 'u') result.underline = true;
  if (!STYLED_TAGS.has(tag)) return result;
  const entries = declarations(style);
  const size = [...entries].reverse().find(([property]) => property === 'font-size');
  if (size) {
    result.fontSize = numeric(size[1], 'font size', finite(parent.fontSize, 18));
    if ((result.fontSize as number) <= 0)
      throw new Error('The reference title needs a positive font size.');
  }
  for (const [property, value] of entries) {
    if (/url\s*\(|expression\s*\(|javascript:/i.test(value)) continue;
    if (property === 'font-family') result.fontFamily = value;
    if (property === 'color')
      result.color = value.startsWith('$') ? (colors[value.slice(1)] ?? '#000000') : value;
    if (property === 'font-weight')
      result.bold = /^(bold|bolder)$/i.test(value) || Number.parseInt(value, 10) >= 600;
    if (property === 'font-style') result.italic = /^(italic|oblique)$/i.test(value);
    if (property === 'text-decoration')
      result.underline = /\bunderline\b/i.test(value) || parent.underline === true;
    if (property === 'text-align')
      result.align = [value, Array.isArray(parent.align) ? parent.align[1] : 'top'];
    if (property === 'letter-spacing' && fields.includes('letterSpacing'))
      result.letterSpacing =
        value === 'normal' ? 0 : numeric(value, 'letter spacing', finite(result.fontSize, 18));
    if (
      property === 'line-height' &&
      (fields.includes('lineHeight') || fields.includes('lineHeightPx'))
    ) {
      const line = numeric(value, 'line height', finite(result.fontSize, 18));
      if (line <= 0) throw new Error('The reference title needs a positive line height.');
      if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) {
        result.lineHeight = line;
        delete result.lineHeightPx;
      } else result.lineHeightPx = line;
    }
  }
  return result;
}

export function richTextBaseline(
  content: Record<string, unknown>,
  colors: Record<string, string> = {},
  fields: readonly RichTextBaselineField[] = [
    'fontFamily',
    'fontSize',
    'color',
    'align',
    'lineHeight',
    'lineHeightPx',
    'letterSpacing',
  ],
): Record<string, unknown> {
  const source = typeof content.text === 'string' ? content.text : '';
  const runs: Record<string, unknown>[] = [];
  const stack: { tag: string; content: Record<string, unknown>; ignored: boolean }[] = [
    { tag: '', content, ignored: false },
  ];
  let cursor = 0;
  const append = (text: string) => {
    const frame = stack[stack.length - 1];
    if (!frame.ignored && decode(text).trim()) runs.push(frame.content);
  };
  for (const token of source.matchAll(TAGS)) {
    append(source.slice(cursor, token.index));
    cursor = token.index + token[0].length;
    const match = token[0].match(/^<(\/)?([a-z][a-z\d-]*)/i);
    if (!match) continue;
    const tag = match[2].toLowerCase();
    if (match[1]) {
      const index = stack.map((frame) => frame.tag).lastIndexOf(tag);
      if (index > 0) stack.splice(index);
      continue;
    }
    if (['br', 'img', 'hr', 'input', 'link', 'meta'].includes(tag) || /\/\s*>$/.test(token[0]))
      continue;
    const parent = stack[stack.length - 1];
    const ignored = parent.ignored || IGNORED_TAGS.has(tag) || tag === 'sup' || tag === 'sub';
    stack.push({
      tag,
      ignored,
      content: ignored
        ? parent.content
        : styledContent(parent.content, tag, attributeStyle(token[0]), colors, fields),
    });
  }
  append(source.slice(cursor));
  if (!runs.length) return { ...content };
  const result = { ...content };
  for (const field of fields) {
    const values = new Set(runs.map((run) => JSON.stringify(run[field])));
    if (values.size > 1)
      throw new Error(
        `The reference title has mixed inline ${field}. Choose a title with one base style.`,
      );
    if (runs[0][field] === undefined) delete result[field];
    else result[field] = structuredClone(runs[0][field]);
  }
  for (const field of ['bold', 'italic', 'underline']) {
    if (runs.every((run) => (run[field] === true) === (runs[0][field] === true)))
      result[field] = runs[0][field] === true;
  }
  return result;
}
