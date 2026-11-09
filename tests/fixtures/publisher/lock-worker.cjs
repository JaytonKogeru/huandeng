'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const [publisherModule, configFile, pptxFixture, label] = process.argv.slice(2);
const directory = path.dirname(configFile);
const lock = path.join(directory, 'publisher-v3.lock');
const commands = new Map();
const received = new Set();
process.on('message', (message) => {
  const resolve = commands.get(message);
  if (resolve) {
    commands.delete(message);
    resolve();
  } else received.add(message);
});
const wait = (command) => {
  if (received.delete(command)) return Promise.resolve();
  return new Promise((resolve) => commands.set(command, resolve));
};

const rename = fs.rename;
fs.rename = async (source, destination) => {
  if (
    source === lock &&
    path.dirname(destination) === path.join(directory, 'publisher-recovered-locks')
  ) {
    process.send({ type: 'observed-dead-owner', owner: path.basename(destination) });
    await wait('reap');
  }
  return rename(source, destination);
};

async function main() {
  const { runPublisher } = require(publisherModule);
  process.send({ type: 'ready' });
  await wait('go');
  const result = await runPublisher(configFile, {
    force: true,
    fingerprint: async () => ({ digest: 'saved-source', newest: 0, count: 3 }),
    exportDeck: async (entry) => {
      if (label === 'crashed-owner') {
        process.send({ type: 'export-entered' });
        await wait('never-sent');
      }
      // This independent exclusive file detects overlapping critical sections,
      // including an older contender stealing the newer publisher's lock.
      const critical = path.join(directory, 'critical-section');
      const handle = await fs.open(critical, 'wx');
      try {
        process.send({ type: 'export-entered' });
        await wait('finish');
        const file = path.join(path.dirname(entry), 'Exports', 'deck.pptx');
        await fs.writeFile(file, await fs.readFile(pptxFixture));
        return { file, report: { pages: [{}] } };
      } finally {
        await handle.close();
        await fs.unlink(critical);
      }
    },
  });
  process.send({ type: 'result', result });
}

main()
  .then(() => {
    process.disconnect();
  })
  .catch((error) => {
    process.send({ type: 'error', message: error.stack });
    process.exitCode = 1;
    process.disconnect();
  });
