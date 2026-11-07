/** User-facing seconds must round-trip through the document's integer milliseconds. */
export function timelineSeconds(timeMs: number): string {
  return String(Number((timeMs / 1000).toFixed(3)));
}

export function parseTimelineSeconds(value: string): number {
  const seconds = Number(value);
  if (!value.trim() || !Number.isFinite(seconds) || seconds < 0)
    throw new Error('请输入大于或等于 0 的秒数。');
  const scaled = seconds * 1000;
  const milliseconds = Math.round(scaled);
  // Decimal inputs such as 1.001 can multiply to 1000.9999999999999 in binary.
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  if (!Number.isSafeInteger(milliseconds) || Math.abs(scaled - milliseconds) > tolerance)
    throw new Error('时间精度为 0.001 秒，请使用最多三位有效小数。');
  return milliseconds;
}
