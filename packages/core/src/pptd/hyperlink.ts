// biome-ignore lint/suspicious/noControlCharactersInRegex: URL validation must reject control characters.
const UNSAFE_URL_CHARACTERS = /[\u0000-\u0020\u007f-\u009f\\]/u;

export function safeHyperlink(value: unknown): string | null {
  if (typeof value !== 'string' || !value || UNSAFE_URL_CHARACTERS.test(value)) return null;
  try {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Encoded controls are equally unsafe.
    if (/[\u0000-\u001f\u007f-\u009f\\]/u.test(decodeURIComponent(value))) return null;
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return /^https?:\/\//i.test(value) && url.hostname && !url.username && !url.password
        ? url.href
        : null;
    }
    return url.protocol === 'mailto:' && url.pathname ? url.href : null;
  } catch {
    return null;
  }
}
