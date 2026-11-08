export function wheelZoomScale(
  scale: number,
  deltaY: number,
  deltaMode: number,
  viewportHeight: number,
): number {
  const delta = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? viewportHeight : 1);
  return Math.max(
    0.15,
    Math.min(3, scale * Math.exp(-Math.max(-250, Math.min(250, delta)) * 0.002)),
  );
}
