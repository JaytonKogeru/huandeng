export class BoundedSvgCache {
  private entries = new Map<string, string>();
  private bytes = 0;

  constructor(
    private maxEntries = 32,
    private maxBytes = 8 * 1024 * 1024,
  ) {}

  get(key: string): string | undefined {
    const value = this.entries.get(key);
    if (value !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  set(key: string, value: string): void {
    const old = this.entries.get(key);
    if (old !== undefined) {
      this.bytes -= (key.length + old.length) * 2;
      this.entries.delete(key);
    }
    const size = (key.length + value.length) * 2;
    if (size > this.maxBytes || this.maxEntries < 1) return;
    this.entries.set(key, value);
    this.bytes += size;
    while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) {
      const first = this.entries.entries().next().value;
      if (!first) break;
      this.entries.delete(first[0]);
      this.bytes -= (first[0].length + first[1].length) * 2;
    }
  }

  usage() {
    return { entries: this.entries.size, estimatedStringBytes: this.bytes };
  }
}
