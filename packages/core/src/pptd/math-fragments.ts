export type MathFragment =
  | { kind: 'text'; value: string; raw: string; display: false }
  | { kind: 'math'; value: string; raw: string; display: boolean };

function escaped(source: string, index: number): boolean {
  let preceding = 0;
  for (let i = index - 1; i >= 0 && source[i] === '\\'; i--) preceding++;
  return preceding % 2 === 1;
}

/** Keep the raw delimiters for editing; only the renderer consumes the parsed value. */
export function splitMathFragments(source: string): MathFragment[] {
  const result: MathFragment[] = [];
  const delimiters = [
    { open: '\\(', close: '\\)', display: false },
    { open: '\\[', close: '\\]', display: true },
    { open: '$$', close: '$$', display: true },
  ];
  let textStart = 0;
  let cursor = 0;
  while (cursor < source.length) {
    const delimiter = escaped(source, cursor)
      ? undefined
      : delimiters.find(({ open }) => source.startsWith(open, cursor));
    if (!delimiter) {
      cursor++;
      continue;
    }
    let end = source.indexOf(delimiter.close, cursor + delimiter.open.length);
    while (end >= 0 && escaped(source, end)) {
      end = source.indexOf(delimiter.close, end + delimiter.close.length);
    }
    if (end < 0) {
      cursor += delimiter.open.length;
      continue;
    }
    if (cursor > textStart) {
      const text = source.slice(textStart, cursor);
      result.push({ kind: 'text', value: text, raw: text, display: false });
    }
    const finish = end + delimiter.close.length;
    result.push({
      kind: 'math',
      value: source.slice(cursor + delimiter.open.length, end),
      raw: source.slice(cursor, finish),
      display: delimiter.display,
    });
    cursor = finish;
    textStart = finish;
  }
  if (textStart < source.length || !result.length) {
    const text = source.slice(textStart);
    result.push({ kind: 'text', value: text, raw: text, display: false });
  }
  return result;
}
