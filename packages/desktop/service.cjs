const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { pathKey } = require('./project.cjs');

function runtimeRoot() {
  return (
    process.env.HUANDENG_RUNTIME_DIR ??
    path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'state'), 'Huandeng')
  );
}

function discoveryPath(entryPath) {
  return path.join(
    runtimeRoot(),
    'sessions',
    `${createHash('sha256').update(pathKey(entryPath)).digest('hex')}.json`,
  );
}

async function readSession(url, entryPath) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)
  ) {
    throw new Error('文档服务必须运行在本机。');
  }
  const response = await fetch(`${url}/__pptd/session`, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error(`文档服务返回 ${response.status}。`);
  const snapshot = await response.json();
  if (pathKey(await fs.realpath(snapshot.entry)) !== pathKey(entryPath)) {
    throw new Error('这个文档服务属于另一个项目。');
  }
  return snapshot;
}

async function existingService(entryPath, readOnly) {
  let record;
  let snapshot;
  try {
    record = JSON.parse(await fs.readFile(discoveryPath(entryPath), 'utf8'));
    snapshot = await readSession(record.url, entryPath);
  } catch {
    return null;
  }
  if (snapshot.desktopProtocol !== 1) {
    throw new Error('这个项目仍由旧版文档服务打开。请关闭旧版编辑器或终端服务，然后重新打开项目。');
  }
  if (snapshot.writable === readOnly) {
    throw new Error('这个项目已经以另一种读写模式打开。请先关闭原有会话。');
  }
  return {
    entryPath,
    url: record.url,
    readOnly,
    owned: false,
    title: snapshot.title,
  };
}

async function coreLauncher() {
  const candidates = [
    path.join(__dirname, 'node_modules', '@open-slide', 'core', 'huandeng.js'),
    path.resolve(__dirname, '..', 'core', 'huandeng.js'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(path.join(path.dirname(candidate), 'dist', 'huandeng', 'bin.js'));
      return candidate;
    } catch {}
  }
  throw new Error(
    'HUANDING 文档服务尚未构建。请先运行 corepack pnpm --filter @open-slide/core build。',
  );
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function startService(entry, options = {}) {
  const entryPath = await fs.realpath(path.resolve(entry));
  if (path.extname(entryPath).toLowerCase() !== '.pptd') {
    throw new Error('请选择项目中的 .pptd 文件。');
  }
  const readOnly = Boolean(options.readOnly);
  const existing = await existingService(entryPath, readOnly);
  if (existing) return existing;
  const launcher = await coreLauncher();
  const port = await availablePort();
  const url = `http://127.0.0.1:${port}`;
  const args = [launcher, 'open', entryPath, '--port', String(port), '--no-browser'];
  if (readOnly) args.push('--read-only');
  const child = spawn(process.execPath, args, {
    cwd: path.dirname(entryPath),
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', HUANDENG_DESKTOP_HOST: '1' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  let exit;
  let spawnError;
  const recordOutput = (chunk) => {
    output = `${output}${chunk}`.slice(-16000);
    options.onLog?.(chunk.toString());
  };
  child.stdout.on('data', recordOutput);
  child.stderr.on('data', recordOutput);
  child.once('error', (error) => {
    spawnError = error;
  });
  child.once('exit', (code, signal) => {
    exit = { code, signal };
  });
  const service = { entryPath, url, readOnly, owned: true, child, title: '' };
  const deadline = Date.now() + 60000;
  try {
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (exit) throw new Error(`文档服务未能启动（${exit.code ?? exit.signal}）。\n${output}`);
      try {
        const snapshot = await readSession(url, entryPath);
        if (snapshot.desktopProtocol !== 1) throw new Error('文档服务需要重新构建。');
        service.title = snapshot.title;
        return service;
      } catch (error) {
        if (error.message === '文档服务需要重新构建。') throw error;
      }
      await delay(120);
    }
    throw new Error(`等待文档服务超时。\n${output}`);
  } catch (error) {
    await stopService(service);
    throw error;
  }
}

async function stopService(service) {
  if (!service?.owned || !service.child) return;
  const child = service.child;
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  if (child.connected) child.send({ type: 'huanding:shutdown' }, () => {});
  else child.kill();
  const finished = await Promise.race([exited.then(() => true), delay(12000).then(() => false)]);
  if (!finished) {
    child.kill();
    await Promise.race([exited, delay(2000)]);
  }
}

module.exports = { startService, stopService, discoveryPath, runtimeRoot };
