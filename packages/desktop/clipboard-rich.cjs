const CUSTOM_MIME = 'web application/vnd.huandeng.elements+json';
const PNG_MIME = 'image/png';
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_PNG_BYTES = 24 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function validateJson(json) {
  if (typeof json !== 'string' || Buffer.byteLength(json, 'utf8') > MAX_JSON_BYTES)
    throw new Error('The copied selection is too large.');
  const value = JSON.parse(json);
  if (
    value?.kind !== 'huandeng-elements' ||
    typeof value.deckId !== 'string' ||
    !Array.isArray(value.elements) ||
    !Array.isArray(value.selectedIds) ||
    value.elements.length > 256
  )
    throw new Error('Clipboard selection must contain HUANDENG elements.');
  return json;
}
function decodePng(base64) {
  if (typeof base64 !== 'string' || base64.length > MAX_PNG_BYTES * 2)
    throw new Error('Clipboard PNG is missing or oversized.');
  const png = Buffer.from(base64, 'base64');
  if (
    png.length < PNG_SIGNATURE.length ||
    png.length > MAX_PNG_BYTES ||
    !png.subarray(0, 8).equals(PNG_SIGNATURE)
  )
    throw new Error('Clipboard image must be a valid PNG.');
  return png;
}

/**
 * Write all formats in one atomic OS clipboard transaction.
 * No text/plain JSON in image mode: external text editors should not see implementation data.
 */
async function writeRichClipboard(clipboard, ClipboardItem, input) {
  if (input?.mode === 'json') {
    await clipboard.writeText(validateJson(input.json));
    return;
  }
  if (input?.mode !== 'rich') throw new Error('Unsupported clipboard mode.');
  const json = validateJson(input.json);
  const png = decodePng(input.pngBase64);
  await clipboard.write([
    new ClipboardItem({
      [PNG_MIME]: new Blob([png], { type: PNG_MIME }),
      [CUSTOM_MIME]: new Blob([json], { type: 'application/vnd.huandeng.elements+json' }),
    }),
  ]);
}
async function readRichClipboard(clipboard) {
  const items = await clipboard.read();
  for (const item of items) {
    const result = { json: null, pngBase64: null };
    if (item.types.includes(CUSTOM_MIME)) {
      const blob = await item.getType(CUSTOM_MIME);
      if (blob.size <= MAX_JSON_BYTES) {
        const json = await blob.text();
        try {
          result.json = validateJson(json);
        } catch {
          // Ignore malformed clipboard payloads from other applications.
        }
      }
    }
    if (item.types.includes(PNG_MIME)) {
      const blob = await item.getType(PNG_MIME);
      if (blob.size <= MAX_PNG_BYTES)
        result.pngBase64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
    }
    if (result.json || result.pngBase64) return result;
  }
  return { json: null, pngBase64: null };
}
module.exports = { CUSTOM_MIME, writeRichClipboard, readRichClipboard };
