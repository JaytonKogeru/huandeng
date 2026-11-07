export function jpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) break;
    const length = view.getUint16(offset);
    const end = offset + length;
    if (length < 2 || end > bytes.length) break;
    if (marker === 0xe1 && text(offset + 2, offset + 8) === 'Exif\0\0') {
      const start = offset + 8;
      if (start + 8 > end) return 1;
      const little = text(start, start + 2) === 'II';
      if (!little && text(start, start + 2) !== 'MM') return 1;
      const word = (position: number) => view.getUint16(position, little);
      const long = (position: number) => view.getUint32(position, little);
      if (word(start + 2) !== 42) return 1;
      const directory = start + long(start + 4);
      if (directory < start || directory + 2 > end) return 1;
      const count = word(directory);
      for (let index = 0; index < count; index++) {
        const entry = directory + 2 + index * 12;
        if (entry + 12 > end) break;
        if (word(entry) === 0x112 && word(entry + 2) === 3 && long(entry + 4) === 1)
          return word(entry + 8);
      }
    }
    offset = end;
  }
  return 1;
}
