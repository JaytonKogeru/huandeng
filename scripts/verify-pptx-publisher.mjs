import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const {
  validateConfig,
  validatePptx,
  publishProject,
  runPublisher,
  createPublisherScheduler,
} = require('../packages/desktop/publisher.cjs');
const fixture = await fs.readFile(path.join(root, 'tests/fixtures/publisher/package.pptx'));

// Repackage this public synthetic fixture independently of the production ZIP
// reader. Each variant retains exact payload bytes unless a test changes them.
function fixtureMembers(bytes = fixture) {
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let offset = bytes.readUInt32LE(end + 16);
  const members = [];
  for (let index = 0; index < bytes.readUInt16LE(end + 10); index++) {
    const length = bytes.readUInt16LE(offset + 28);
    const name = bytes.toString('utf8', offset + 46, offset + 46 + length);
    const local = bytes.readUInt32LE(offset + 42);
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    const data = bytes.subarray(start, start + bytes.readUInt32LE(offset + 20));
    members.push({
      name,
      data: bytes.readUInt16LE(offset + 10) === 8 ? inflateRawSync(data) : Buffer.from(data),
    });
    offset += 46 + length + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
  }
  return members;
}

function packageMembers(
  members,
  { method = 0, reverse = false, descriptor = false, signed = true } = {},
) {
  const locals = [],
    directory = [];
  let position = 0;
  for (const member of reverse ? [...members].reverse() : members) {
    const name = Buffer.from(member.name);
    const data = member.data;
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const compressed = method === 8 ? deflateRawSync(data, { level: 9 }) : data;
    const local = Buffer.alloc(30),
      central = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800 | (descriptor ? 8 : 0), 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(33, 12);
    if (!descriptor) {
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(compressed.length, 18);
      local.writeUInt32LE(data.length, 22);
    }
    local.writeUInt16LE(name.length, 26);
    central.writeUInt32LE(0x02014b50);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800 | (descriptor ? 8 : 0), 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(position, 42);
    const trailer = Buffer.alloc(descriptor ? (signed ? 16 : 12) : 0);
    if (descriptor) {
      const start = signed ? 4 : 0;
      if (signed) trailer.writeUInt32LE(0x08074b50);
      trailer.writeUInt32LE(crc, start);
      trailer.writeUInt32LE(compressed.length, start + 4);
      trailer.writeUInt32LE(data.length, start + 8);
    }
    locals.push(local, name, compressed, trailer);
    directory.push(central, name);
    position += local.length + name.length + compressed.length + trailer.length;
  }
  const central = Buffer.concat(directory),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(members.length, 8);
  end.writeUInt16LE(members.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(position, 16);
  return Buffer.concat([...locals, central, end]);
}

function publisherWorker(configFile, label) {
  const child = fork(
    path.join(root, 'tests/fixtures/publisher/lock-worker.cjs'),
    [
      path.join(root, 'packages/desktop/publisher.cjs'),
      configFile,
      path.join(root, 'tests/fixtures/publisher/package.pptx'),
      label,
    ],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] },
  );
  const messages = [];
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-8000);
  });
  child.on('message', (message) => messages.push(message));
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  return {
    child,
    done,
    messages,
    send(message) {
      child.send(message);
    },
    wait(type) {
      const existing = messages.find((message) => message.type === type);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          child.off('message', onMessage);
          child.off('exit', onExit);
        };
        const onMessage = (message) => {
          if (message.type === 'error') {
            cleanup();
            reject(new Error(message.message));
          } else if (message.type === type) {
            cleanup();
            resolve(message);
          }
        };
        const onExit = (code, signal) => {
          cleanup();
          reject(new Error(`${label} exited before ${type}: ${code}/${signal} ${stderr}`));
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`${label} did not report ${type}: ${stderr}`));
        }, 10000);
        child.on('message', onMessage);
        child.once('exit', onExit);
      });
    },
    async stop() {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await done;
    },
  };
}

async function setup(t, packageBytes = fixture) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-publisher-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = {
    id: 'example',
    entry: path.join(directory, 'Project', 'deck.pptd'),
    destination: path.join(directory, 'Share', 'Example.pptx'),
  };
  const output = path.join(directory, 'Project', 'Exports', 'deck.pptx');
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.mkdir(path.dirname(project.destination), { recursive: true });
  await fs.writeFile(project.entry, '{}');
  await fs.writeFile(project.destination, 'previous valid shared output');
  const fingerprint = async () => ({ digest: 'saved-source', newest: 0, count: 3 });
  let exports = 0;
  const exportDeck = async (entry) => {
    assert.equal(entry, project.entry);
    exports++;
    await fs.writeFile(output, packageBytes);
    return { file: output, report: { pages: [{ pageId: 'synthetic-page' }] } };
  };
  return { directory, project, output, fingerprint, exportDeck, exportCount: () => exports };
}

test('publisher accepts only explicit unique PPTD entries and shared PPTX paths', () => {
  const base = {
    id: 'a',
    entry: path.resolve('a/deck.pptd'),
    destination: path.resolve('Share/a.pptx'),
  };
  assert.equal(validateConfig({ schemaVersion: 1, projects: [base] }).quietMs, 3000);
  assert.throws(
    () => validateConfig({ schemaVersion: 1, projects: [base, { ...base, id: 'b' }] }),
    /unique/,
  );
  assert.throws(
    () => validateConfig({ schemaVersion: 1, projects: [{ ...base, entry: 'relative.pptd' }] }),
    /absolute/,
  );
  assert.throws(
    () =>
      validateConfig({
        schemaVersion: 1,
        projects: [{ ...base, destination: path.resolve('a/Exports/deck.pptx') }],
      }),
    /different path/,
  );
});

test('PPTX validation checks every ZIP member, notes and reported slide count', () => {
  const result = validatePptx(fixture, 1);
  assert.equal(result.slides, 1);
  assert.equal(result.notes, 1);
  assert.equal(result.sha256.length, 64);
  assert.equal(result.contentSha256.length, 64);
  assert.throws(() => validatePptx(fixture, 2), /page count/);
  assert.throws(() => validatePptx(fixture.subarray(0, fixture.length - 4)), /ZIP end/);
  const corrupt = Buffer.from(fixture);
  const central = corrupt.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  corrupt[central + 16] ^= 1;
  assert.throws(() => validatePptx(corrupt), /checksum/);
});

test('native Project output is verified before the fixed shared filename is replaced', async (t) => {
  const s = await setup(t);
  const result = await publishProject(s.project, undefined, s);
  assert.equal(result.projectFile, s.output);
  assert.equal(result.status, 'current');
  assert.equal(result.sharedSha256, result.sha256);
  assert.equal(result.byteIdentical, true);
  assert.deepEqual(await fs.readFile(s.project.destination), await fs.readFile(s.output));
  assert.equal(s.exportCount(), 1);
});

test('unchanged sources do not export again; a missing shared copy is repaired from the verified Project file', async (t) => {
  const s = await setup(t);
  const first = await publishProject(s.project, undefined, s);
  const second = await publishProject(s.project, first, s);
  assert.equal(second.sha256, first.sha256);
  assert.equal(s.exportCount(), 1);
  await fs.unlink(s.project.destination);
  const repaired = await publishProject(s.project, first, s);
  assert.equal(repaired.sha256, first.sha256);
  assert.equal(s.exportCount(), 1);
  assert.deepEqual(await fs.readFile(s.project.destination), fixture);
});

test('metadata-only ZIP repackaging stays current without export or mirror, with accurate raw hashes', async (t) => {
  const s = await setup(t);
  const first = await publishProject(s.project, undefined, s);
  const { contentSha256, sharedSha256, sharedBytes, byteIdentical, ...legacyState } = first;
  const rename = async () => {
    assert.fail('Equivalent content must not attempt an Office-locked replacement.');
  };
  for (const packing of [
    { reverse: true },
    { method: 8, descriptor: true },
    { method: 8, reverse: true, descriptor: true, signed: false },
  ]) {
    const repacked = packageMembers(fixtureMembers(), packing);
    const verified = validatePptx(repacked, 1);
    assert.notEqual(verified.sha256, first.sha256);
    await fs.writeFile(s.project.destination, repacked);
    const current = await publishProject(s.project, legacyState, { ...s, rename });
    assert.equal(current.status, 'current');
    assert.equal(current.sha256, first.sha256);
    assert.equal(current.sharedSha256, verified.sha256);
    assert.equal(current.sharedBytes, repacked.length);
    assert.equal(current.contentSha256, first.contentSha256);
    assert.equal(current.byteIdentical, false);
    assert.equal(current.publishedAt, first.publishedAt);
    assert.deepEqual(await fs.readFile(s.project.destination), repacked);
    assert.deepEqual(await fs.readFile(s.output), fixture);
    assert.equal((await publishProject(s.project, current, { ...s, rename })).status, 'current');
  }
  assert.equal(s.exportCount(), 1);
});

test('equivalence includes every payload, including document properties, export report and media', async (t) => {
  const members = [
    ...fixtureMembers(),
    {
      name: 'docProps/core.xml',
      data: Buffer.from('<coreProperties><modified>2026-01-01</modified></coreProperties>'),
    },
    { name: 'huandeng/export-report.json', data: Buffer.from('{"synthetic":true}') },
    { name: 'ppt/media/example.bin', data: Buffer.from([0, 1, 2, 3]) },
  ];
  const canonical = packageMembers(members, { method: 8 });
  const s = await setup(t, canonical);
  const first = await publishProject(s.project, undefined, s);
  let mirrors = 0;
  for (const changed of members) {
    const different = packageMembers(
      members.map((member) => ({
        ...member,
        data: member === changed ? Buffer.concat([member.data, Buffer.from('\n')]) : member.data,
      })),
      { reverse: true },
    );
    assert.notEqual(validatePptx(different).contentSha256, first.contentSha256, changed.name);
    await fs.writeFile(s.project.destination, different);
    const result = await publishProject(s.project, first, {
      ...s,
      rename: async (...args) => {
        mirrors++;
        await fs.rename(...args);
      },
    });
    assert.equal(result.byteIdentical, true, changed.name);
    assert.deepEqual(await fs.readFile(s.project.destination), canonical, changed.name);
  }
  assert.equal(mirrors, members.length);
  assert.equal(s.exportCount(), 1);
});

test('entry name or member-set changes cannot be accepted as equivalent', async (t) => {
  const members = [
    ...fixtureMembers(),
    { name: 'custom/a.bin', data: Buffer.from('same payload') },
  ];
  const canonical = packageMembers(members);
  const s = await setup(t, canonical);
  const first = await publishProject(s.project, undefined, s);
  let mirrors = 0;
  for (const changed of [
    members.map((entry) => ({
      ...entry,
      name: entry.name === 'custom/a.bin' ? 'custom/b.bin' : entry.name,
    })),
    members.slice(0, -1),
    [...members, { name: 'custom/empty.bin', data: Buffer.alloc(0) }],
  ]) {
    await fs.writeFile(s.project.destination, packageMembers(changed));
    await publishProject(s.project, first, {
      ...s,
      rename: async (...args) => {
        mirrors++;
        await fs.rename(...args);
      },
    });
    assert.deepEqual(await fs.readFile(s.project.destination), canonical);
  }
  assert.equal(mirrors, 3);
});

test('corrupt payloads, inconsistent local headers and duplicate entries cannot falsely skip repair', async (t) => {
  const members = fixtureMembers();
  const corruptData = packageMembers(members);
  corruptData[30 + Buffer.byteLength(members[0].name)] ^= 1;
  const corruptHeader = packageMembers(members);
  corruptHeader.writeUInt16LE(8, 8); // Local header says DEFLATE, central directory says STORE.
  const corruptDescriptor = packageMembers(members, { descriptor: true });
  corruptDescriptor[30 + Buffer.byteLength(members[0].name) + members[0].data.length + 4] ^= 1;
  const duplicate = packageMembers([...members, members[0]]);
  const s = await setup(t);
  const first = await publishProject(s.project, undefined, s);
  let mirrors = 0;
  for (const invalid of [corruptData, corruptHeader, corruptDescriptor, duplicate]) {
    assert.throws(() => validatePptx(invalid));
    await fs.writeFile(s.project.destination, invalid);
    await publishProject(s.project, first, {
      ...s,
      rename: async (...args) => {
        mirrors++;
        await fs.rename(...args);
      },
    });
    assert.deepEqual(await fs.readFile(s.project.destination), fixture);
  }
  assert.equal(mirrors, 4);
  assert.equal(s.exportCount(), 1);
});

test('changed source or canonical Project output never uses the equivalence shortcut', async (t) => {
  const s = await setup(t);
  const first = await publishProject(s.project, undefined, s);
  const equivalent = packageMembers(fixtureMembers(), { reverse: true });
  await fs.writeFile(s.project.destination, equivalent);
  const sourceChanged = await publishProject(s.project, first, {
    ...s,
    fingerprint: async () => ({ digest: 'new-source', newest: 0 }),
  });
  assert.equal(s.exportCount(), 2);
  assert.equal(sourceChanged.byteIdentical, true);
  await fs.writeFile(s.output, equivalent);
  await fs.writeFile(s.project.destination, equivalent);
  await publishProject(s.project, sourceChanged, {
    ...s,
    fingerprint: async () => ({ digest: 'new-source', newest: 0 }),
  });
  assert.equal(s.exportCount(), 3);
  assert.deepEqual(await fs.readFile(s.output), fixture);
});

test('a save during equivalence verification remains waiting without replacing the shared file', async (t) => {
  const s = await setup(t);
  const first = await publishProject(s.project, undefined, s);
  const equivalent = packageMembers(fixtureMembers(), { reverse: true });
  await fs.writeFile(s.project.destination, equivalent);
  let reads = 0;
  const result = await publishProject(s.project, first, {
    ...s,
    fingerprint: async () => ({
      digest: reads++ ? 'changed-during-verification' : 'saved-source',
      newest: 0,
    }),
    rename: async () => assert.fail('A concurrent save must not replace the shared copy.'),
  });
  assert.equal(result.status, 'waiting');
  assert.equal(reads, 2);
  assert.equal(s.exportCount(), 1);
  assert.deepEqual(await fs.readFile(s.project.destination), equivalent);
});

test('changed source during export retains the previous shared output', async (t) => {
  const s = await setup(t);
  let reads = 0;
  const result = await publishProject(s.project, undefined, {
    ...s,
    fingerprint: async () => ({ digest: reads++ ? 'newer-source' : 'saved-source', newest: 0 }),
  });
  assert.equal(result.status, 'waiting');
  assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');
});

test('an export failure or corrupt package cannot replace the shared output', async (t) => {
  const s = await setup(t);
  await assert.rejects(
    publishProject(s.project, undefined, {
      ...s,
      exportDeck: async () => {
        throw new Error('Missing image');
      },
    }),
    /Missing image/,
  );
  await assert.rejects(
    publishProject(s.project, undefined, {
      ...s,
      exportDeck: async () => {
        await fs.writeFile(s.output, Buffer.from('broken export'));
        return { file: s.output, report: { pages: [{}] } };
      },
    }),
    /PPTX size/,
  );
  assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');
});

test('a locked shared file retains its bytes and leaves no temporary file', async (t) => {
  const s = await setup(t);
  const rename = async () => {
    throw Object.assign(new Error('File is open in Office'), { code: 'EPERM' });
  };
  await assert.rejects(publishProject(s.project, undefined, { ...s, rename }), /open in Office/);
  assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');
  assert.deepEqual(await fs.readdir(path.dirname(s.project.destination)), ['Example.pptx']);
});

test('Project errors are recorded without blocking another configured Project', async (t) => {
  const s = await setup(t);
  const second = {
    id: 'other',
    entry: path.join(s.directory, 'Other', 'deck.pptd'),
    destination: path.join(s.directory, 'Share', 'Other.pptx'),
  };
  await fs.mkdir(path.join(s.directory, 'Other', 'Exports'), { recursive: true });
  const configFile = path.join(s.directory, 'config.json');
  await fs.writeFile(
    configFile,
    JSON.stringify({ schemaVersion: 1, quietMs: 0, projects: [s.project, second] }),
  );
  const exportDeck = async (entry) => {
    if (entry === s.project.entry) throw new Error('Synthetic first-Project failure');
    const file = path.join(s.directory, 'Other', 'Exports', 'deck.pptx');
    await fs.writeFile(file, fixture);
    return { file, report: { pages: [{}] } };
  };
  const result = await runPublisher(configFile, { fingerprint: s.fingerprint, exportDeck });
  assert.equal(result.status, 'error');
  assert.deepEqual(
    result.results.map((item) => item.status),
    ['error', 'current'],
  );
  assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');
  assert.deepEqual(await fs.readFile(second.destination), fixture);
  const state = JSON.parse(await fs.readFile(path.join(s.directory, 'state-v2.json'), 'utf8'));
  assert.equal(state.projects.other.slides, 1);
  assert.equal(state.projects.example.status, 'error');
});

test('a live publisher lock prevents overlapping runs', async (t) => {
  const s = await setup(t);
  const configFile = path.join(s.directory, 'config.json');
  await fs.writeFile(configFile, JSON.stringify({ schemaVersion: 1, projects: [s.project] }));
  await fs.writeFile(
    path.join(s.directory, 'publisher-v2.lock'),
    JSON.stringify({ pid: process.pid, owner: 'existing-run' }),
  );
  const result = await runPublisher(configFile, s);
  assert.equal(result.status, 'busy');
  assert.equal(s.exportCount(), 0);
  assert.equal(
    JSON.parse(await fs.readFile(path.join(s.directory, 'publisher-v2.lock'), 'utf8')).owner,
    'existing-run',
  );
});

test('two real processes recovering a crashed publisher cannot steal the winning lock', {
  timeout: 30000,
}, async (t) => {
  const s = await setup(t);
  const configFile = path.join(s.directory, 'config.json');
  await fs.writeFile(
    configFile,
    JSON.stringify({ schemaVersion: 1, quietMs: 0, projects: [s.project] }),
  );
  const workers = [];
  const spawnWorker = (label) => {
    const worker = publisherWorker(configFile, label);
    workers.push(worker);
    return worker;
  };
  try {
    const crashed = spawnWorker('crashed-owner');
    await crashed.wait('ready');
    crashed.send('go');
    await crashed.wait('export-entered');
    const lock = path.join(s.directory, 'publisher-v3.lock');
    const oldOwner = JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8'));
    await crashed.stop();

    const save = spawnWorker('save-trigger');
    const fallback = spawnWorker('scheduled-fallback');
    await Promise.all([save.wait('ready'), fallback.wait('ready')]);
    save.send('go');
    fallback.send('go');
    const observed = await Promise.all([
      save.wait('observed-dead-owner'),
      fallback.wait('observed-dead-owner'),
    ]);
    assert.deepEqual(
      observed.map((item) => item.owner),
      [oldOwner.owner, oldOwner.owner],
    );

    save.send('reap');
    await save.wait('export-entered');
    const activeOwner = await fs.readFile(path.join(lock, 'owner.json'), 'utf8');
    fallback.send('reap');
    assert.equal((await fallback.wait('result')).result.status, 'busy');
    assert.equal(await fs.readFile(path.join(lock, 'owner.json'), 'utf8'), activeOwner);
    assert.equal(
      fallback.messages.filter((message) => message.type === 'export-entered').length,
      0,
    );
    assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');

    save.send('finish');
    assert.equal((await save.wait('result')).result.status, 'complete');
    assert.equal((await save.done).code, 0);
    assert.equal((await fallback.done).code, 0);
    assert.deepEqual(await fs.readFile(s.project.destination), fixture);
    await assert.rejects(fs.stat(lock), { code: 'ENOENT' });
    const retired = JSON.parse(
      await fs.readFile(
        path.join(s.directory, 'publisher-recovered-locks', oldOwner.owner, 'owner.json'),
        'utf8',
      ),
    );
    assert.equal(retired.pid, oldOwner.pid);
    assert.equal(
      (await fs.readdir(s.directory)).some(
        (name) => name.endsWith('.candidate') || name.endsWith('.released'),
      ),
      false,
    );
  } finally {
    await Promise.all(workers.map((worker) => worker.stop()));
  }
});

test('save-triggered scheduling uses explicit entries, a hidden process and the packaged Node host', async (t) => {
  const s = await setup(t);
  const configFile = path.join(s.directory, 'config.json');
  await fs.writeFile(configFile, JSON.stringify({ schemaVersion: 1, projects: [s.project] }));
  const calls = [];
  const scheduler = createPublisherScheduler({
    configFile,
    debounceMs: 60000,
    spawn: (...args) => {
      calls.push(args);
      const child = new EventEmitter();
      child.unref = () => {};
      return child;
    },
  });
  t.after(() => scheduler.dispose());
  scheduler.schedule(s.project.entry);
  scheduler.schedule(path.join(s.directory, 'Unconfigured', 'deck.pptd'));
  await scheduler.flush();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1].slice(-2), ['--entry', s.project.entry]);
  assert.equal(calls[0][2].windowsHide, true);
  assert.equal(calls[0][2].stdio, 'ignore');
  assert.equal(calls[0][2].env.ELECTRON_RUN_AS_NODE, '1');
  scheduler.dispose();
  scheduler.schedule(s.project.entry);
  await scheduler.flush();
  assert.equal(calls.length, 1);
});
