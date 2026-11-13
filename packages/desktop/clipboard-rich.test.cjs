const assert = require('node:assert/strict');
const { test } = require('node:test');
const { CUSTOM_MIME, writeRichClipboard, readRichClipboard } = require('./clipboard-rich.cjs');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1cAAAAASUVORK5CYII=',
  'base64',
);
const json = JSON.stringify({
  kind: 'huandeng-elements',
  deckId: 'project',
  elements: [{ elementId: 'i', elementType: 'image' }],
  selectedIds: ['i'],
});
class Item {
  constructor(data) {
    this.data = data;
    this.types = Object.keys(data);
  }
  async getType(type) {
    return this.data[type];
  }
}
function fakeClipboard() {
  return {
    items: [],
    async write(items) {
      this.items = items;
    },
    async writeText(text) {
      this.items = [new Item({ 'text/plain': new Blob([text]) })];
    },
    async read() {
      return this.items;
    },
  };
}
test('copies image and private editable data together, without leaking JSON as plain text', async () => {
  const clipboard = fakeClipboard();
  await writeRichClipboard(clipboard, Item, {
    mode: 'rich',
    json,
    pngBase64: png.toString('base64'),
  });
  assert.deepEqual(clipboard.items[0].types.sort(), [CUSTOM_MIME, 'image/png'].sort());
  const copy = await readRichClipboard(clipboard);
  assert.equal(copy.json, json);
  assert.equal(copy.pngBase64, png.toString('base64'));
});
test('parameter shortcut copies only the JSON text', async () => {
  const clipboard = fakeClipboard();
  await writeRichClipboard(clipboard, Item, { mode: 'json', json });
  assert.deepEqual(clipboard.items[0].types, ['text/plain']);
});
test('external image clipboard has image without editable metadata', async () => {
  const clipboard = fakeClipboard();
  clipboard.items = [new Item({ 'image/png': new Blob([png], { type: 'image/png' }) })];
  const read = await readRichClipboard(clipboard);
  assert.equal(read.json, null);
  assert.ok(read.pngBase64);
});
test('rejects oversized/malformed input without modifying the clipboard', async () => {
  const clipboard = fakeClipboard();
  await assert.rejects(
    writeRichClipboard(clipboard, Item, {
      mode: 'rich',
      json: '{"kind":"wrong"}',
      pngBase64: png.toString('base64'),
    }),
  );
  await assert.rejects(
    writeRichClipboard(clipboard, Item, { mode: 'rich', json, pngBase64: 'garbage' }),
  );
  assert.equal(clipboard.items.length, 0);
});
