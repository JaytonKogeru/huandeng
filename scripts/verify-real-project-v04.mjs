import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { chromium } = require('playwright');
const { unzipSync } = require('fflate');
const YAML = require('yaml');
const input = process.argv[2];
if (!input || !path.isAbsolute(input) || process.argv.length !== 3) {
  console.error('Usage: node scripts/verify-real-project-v04.mjs <absolute-path-to-entry.pptd>');
  process.exitCode = 2;
} else {
  await verify(input);
}

function inside(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return (
    relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function relativePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.includes(':'))
    throw new Error(`Unsafe project path: ${String(value)}`);
  const normalized = path.posix.normalize(value.replace(/\\/g, '/'));
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.startsWith('/')
  )
    throw new Error(`Path escapes the source project: ${value}`);
  if (
    ['exports', 'scripts', '.git', 'node_modules'].includes(normalized.split('/')[0].toLowerCase())
  )
    throw new Error(`Required input refers to an excluded directory: ${value}`);
  return normalized;
}

function assetReferences(value, found = new Set()) {
  if (Array.isArray(value)) for (const item of value) assetReferences(item, found);
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (
        (key === 'src' || key === 'url') &&
        typeof item === 'string' &&
        item &&
        !/^(https?:|data:|blob:|#)/i.test(item)
      )
        found.add(item);
      else if (item && typeof item === 'object') assetReferences(item, found);
    }
  }
  return found;
}

function parseDocument(bytes, name) {
  const document = YAML.parseDocument(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  if (document.errors.length)
    throw new Error(`${name}: ${document.errors.map((error) => error.message).join('; ')}`);
  return document.toJS({ maxAliasCount: 1000 });
}

async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function errorRecord(error) {
  return {
    message: error instanceof Error ? error.message : String(error),
    ...(error?.code ? { code: error.code } : {}),
    ...(error?.details ? { details: error.details } : {}),
    ...(error?.report ? { report: error.report } : {}),
  };
}

async function eventually(callback, timeout = 90000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw last ?? new Error('Timed out waiting for the isolated project service.');
}

async function ensurePortAvailable(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen({ host: '127.0.0.1', port, exclusive: true }, resolve);
  });
  await new Promise((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
}

async function verify(entryArgument) {
  const startedAt = new Date().toISOString();
  const reportRoot = path.join(root, '.verification', 'real-project-v04');
  const runId = `${startedAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const runDirectory = path.join(reportRoot, 'runs', runId);
  const sourceFiles = new Map();
  const checks = [];
  const failures = [];
  const rendererErrors = [];
  const pageResults = [];
  const exports = {};
  const logs = [];
  const port = Number(process.env.HUANDENG_REAL_PROJECT_PORT ?? 4876);
  const url = `http://127.0.0.1:${port}`;
  let sourceEntry;
  let sourceRoot;
  let manifest;
  let sandbox;
  let candidateRoot;
  let candidateEntry;
  let child;
  let browser;
  let browserPage;
  let token = '';
  let targetVerified = false;
  let snapshot;
  let sourceVerification = { unchanged: false, files: [] };
  let checkpointResult;

  const api = async (route, body, timeout = 240000) => {
    if (body !== undefined && !targetVerified)
      throw new Error('Refusing a write before the temporary project service is verified.');
    const response = await fetch(`${url}/__pptd${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-huandeng-token': token },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(timeout),
    });
    const data = await response.json();
    if (!response.ok)
      throw Object.assign(new Error(`${route}: ${data.message ?? response.status}`), {
        code: data.code,
        details: data.details,
        report: data.report,
      });
    return data;
  };

  const check = async (name, callback, required = false) => {
    const start = Date.now();
    try {
      const result = await callback();
      checks.push({ name, passed: true, milliseconds: Date.now() - start });
      process.stdout.write(`PASS ${name}\n`);
      return result;
    } catch (error) {
      const detail = errorRecord(error);
      failures.push({ check: name, ...detail });
      checks.push({ name, passed: false, milliseconds: Date.now() - start, error: detail });
      process.stderr.write(`FAIL ${name}: ${detail.message}\n`);
      if (required) throw error;
      return undefined;
    }
  };

  const resolveSource = async (relative) => {
    const real = await fs.realpath(path.join(sourceRoot, relativePath(relative)));
    if (!inside(sourceRoot, real))
      throw new Error(`Source input resolves outside the source project: ${relative}`);
    return real;
  };

  const copyFile = async (relative) => {
    const normalized = relativePath(relative);
    const destination = path.join(candidateRoot, normalized);
    if (sourceFiles.has(normalized)) return destination;
    const real = await resolveSource(normalized);
    if (!(await fs.stat(real)).isFile())
      throw new Error(`Expected a regular source file: ${normalized}`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const record = { path: normalized, sha256: null, bytes: 0, readComplete: false };
    sourceFiles.set(normalized, record);
    const hash = createHash('sha256');
    await pipeline(
      createReadStream(real),
      new Transform({
        transform(chunk, _encoding, callback) {
          hash.update(chunk);
          record.bytes += chunk.length;
          callback(null, chunk);
        },
      }),
      createWriteStream(destination, { flags: 'wx' }),
    );
    record.sha256 = hash.digest('hex');
    record.readComplete = true;
    return destination;
  };

  const copyDirectory = async (relative, ancestors = new Set()) => {
    const normalized = relativePath(relative);
    let real;
    try {
      real = await resolveSource(normalized);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    const stat = await fs.stat(real);
    if (stat.isFile()) {
      await copyFile(normalized);
      return;
    }
    if (!stat.isDirectory()) throw new Error(`Unsupported source filesystem entry: ${normalized}`);
    if (ancestors.has(real))
      throw new Error(`Source directory contains a symlink cycle: ${normalized}`);
    const next = new Set([...ancestors, real]);
    await fs.mkdir(path.join(candidateRoot, normalized), { recursive: true });
    for (const name of (await fs.readdir(real)).sort())
      await copyDirectory(`${normalized}/${name}`, next);
  };

  const candidatePageHashes = async () =>
    Object.fromEntries(
      await Promise.all(
        [...sourceFiles.keys()]
          .filter(
            (file) =>
              file.endsWith('.page') ||
              manifest.pages.some((value) => relativePath(value) === file),
          )
          .map(async (file) => [file, await hashFile(path.join(candidateRoot, file))]),
      ),
    );
  const assertPageHashes = async (expected, except) => {
    for (const [file, hash] of Object.entries(expected))
      if (file !== except)
        assert.equal(
          await hashFile(path.join(candidateRoot, file)),
          hash,
          `Temporary page changed unexpectedly: ${file}`,
        );
  };
  const transaction = async (operations) => {
    const current = await api('/session');
    return api('/transactions', {
      requestId: randomUUID(),
      deckId: current.deckId,
      actor: 'isolated-real-project-v04',
      expected: {
        manifest: current.manifestRevision,
        metadata: current.metadataRevision,
        pages: Object.fromEntries(current.pages.map((page) => [page.pageId, page.pageRevision])),
      },
      operations,
    });
  };

  try {
    sourceEntry = await fs.realpath(entryArgument);
    sourceRoot = await fs.realpath(path.dirname(sourceEntry));
    if (inside(sourceRoot, reportRoot) || inside(sourceRoot, os.tmpdir()))
      throw new Error(
        'The source directory must not contain the verification output or temporary directory.',
      );
    await fs.mkdir(path.join(runDirectory, 'pages'), { recursive: true });
    sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-real-project-v04-'));
    candidateRoot = path.join(sandbox, 'project');
    await fs.mkdir(candidateRoot);
    assert.equal(
      inside(sourceRoot, candidateRoot),
      false,
      'Temporary project must be outside the source project.',
    );

    await check(
      'copy source inputs into an isolated project with realpath containment and hashes',
      async () => {
        candidateEntry = await copyFile(path.basename(sourceEntry));
        manifest = parseDocument(await fs.readFile(candidateEntry), path.basename(sourceEntry));
        assert.ok(
          Array.isArray(manifest?.pages) &&
            manifest.pages.length &&
            manifest.pages.every((page) => typeof page === 'string'),
          'The manifest must contain at least one page path.',
        );
        const expectedManifest = process.env.HUANDENG_EXPECTED_MANIFEST_SHA;
        if (expectedManifest)
          assert.equal(
            sourceFiles.get(path.basename(sourceEntry)).sha256,
            expectedManifest.toLowerCase(),
            'Source manifest does not match the expected baseline hash.',
          );
        for (const directory of ['pages', 'media', 'assets', '.huandeng'])
          await copyDirectory(directory);
        const pagePaths = new Set(manifest.pages.map(relativePath));
        const metadataPath = path.join(candidateRoot, '.huandeng', 'project.json');
        if (existsSync(metadataPath)) {
          const metadata = JSON.parse(
            (await fs.readFile(metadataPath, 'utf8')).replace(/^\uFEFF/, ''),
          );
          for (const identity of Object.values(metadata.slides ?? {})) {
            if (identity && typeof identity.path === 'string') {
              const relative = relativePath(identity.path);
              try {
                await resolveSource(relative);
                pagePaths.add(relative);
              } catch (error) {
                if (error.code !== 'ENOENT' || identity.state === 'active') throw error;
              }
            }
          }
        }
        const assets = assetReferences(manifest);
        for (const file of pagePaths) {
          const copied = await copyFile(file);
          assetReferences(parseDocument(await fs.readFile(copied), file), assets);
        }
        for (const asset of assets) await copyFile(asset);
        assert.equal(existsSync(path.join(candidateRoot, 'Exports')), false);
        assert.equal(existsSync(path.join(candidateRoot, 'scripts')), false);
      },
      true,
    );

    await check(
      'start a writer only for the verified temporary copy',
      async () => {
        assert.ok(
          Number.isInteger(port) && port > 1024 && port < 65536,
          'Invalid verification port.',
        );
        await ensurePortAvailable(port);
        const realCandidate = await fs.realpath(candidateRoot);
        assert.equal(inside(sourceRoot, realCandidate), false);
        child = spawn(
          process.execPath,
          [
            path.join(root, 'packages/core/huandeng.js'),
            'open',
            candidateEntry,
            '--port',
            String(port),
            '--no-browser',
          ],
          {
            cwd: root,
            env: { ...process.env, HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime') },
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        child.stdout.on('data', (data) => logs.push(String(data)));
        child.stderr.on('data', (data) => logs.push(String(data)));
        child.on('error', (error) => logs.push(String(error)));
        snapshot = await eventually(async () => {
          const current = await api('/session', undefined, 3000);
          token = current.sessionToken;
          return current;
        });
        const project = await api('/project');
        assert.equal(
          await fs.realpath(project.root),
          realCandidate,
          'Port does not belong to the isolated project; refusing all writes.',
        );
        targetVerified = true;
        assert.equal(
          snapshot.pages.length,
          manifest.pages.length,
          'The editor did not load every manifest page.',
        );
        assert.ok(snapshot.writable);
      },
      true,
    );

    const exportBaseline = await candidatePageHashes();
    for (const format of ['pdf', 'pptx'])
      await check(
        `export the complete isolated scientific project as ${format.toUpperCase()}`,
        async () => {
          const exported = await api('/export', { format });
          const bytes = await fs.readFile(exported.file);
          assert.equal(exported.report.complete, true, `${format} export report is incomplete.`);
          assert.equal(exported.report.pages.length, snapshot.pages.length);
          let pageCount;
          if (format === 'pdf') {
            assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
            pageCount = (bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
            assert.equal(
              pageCount,
              snapshot.pages.length,
              'PDF page dictionary count differs from the manifest.',
            );
          } else {
            const zip = unzipSync(bytes);
            pageCount = Object.keys(zip).filter((name) =>
              /^ppt\/slides\/slide\d+\.xml$/.test(name),
            ).length;
            assert.equal(
              pageCount,
              snapshot.pages.length,
              'PPTX slide count differs from the manifest.',
            );
          }
          const destination = path.join(runDirectory, `complete-project.${format}`);
          await fs.writeFile(destination, bytes);
          await fs.writeFile(
            `${destination}.report.json`,
            JSON.stringify(exported.report, null, 2),
          );
          exports[format] = {
            file: destination,
            pageCount,
            bytes: bytes.length,
            report: exported.report,
            snapshotUrl: `${url}/huandeng/export/${new URL(exported.url, url).pathname.split('/')[3]}`,
          };
          await assertPageHashes(exportBaseline);
        },
      );

    await check(
      'capture every slide from the export DOM and reject unsupported objects or formula failures',
      async () => {
        const executablePath = [
          process.env.HUANDENG_BROWSER,
          '/usr/bin/chromium',
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
          'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
        ].find((file) => file && existsSync(file));
        browser = await chromium.launch({
          ...(executablePath ? { executablePath } : {}),
          headless: true,
          args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
        });
        browserPage = await browser.newPage({
          viewport: {
            width: Math.ceil(snapshot.size[0] + 40),
            height: Math.ceil(snapshot.size[1] + 40),
          },
          deviceScaleFactor: 2,
        });
        browserPage.setDefaultTimeout(45000);
        browserPage.on('pageerror', (error) => rendererErrors.push(error.message));
        const fullSnapshotUrl = exports.pdf?.snapshotUrl ?? exports.pptx?.snapshotUrl;
        if (fullSnapshotUrl)
          await browserPage.goto(fullSnapshotUrl, { waitUntil: 'networkidle', timeout: 120000 });
        for (let index = 0; index < snapshot.pages.length; index++) {
          const current = snapshot.pages[index];
          const label = (current.metadata.label ?? current.shortCode ?? String(index + 1)).replace(
            /[^a-zA-Z0-9_-]/g,
            '_',
          );
          const png = path.join(
            runDirectory,
            'pages',
            `${String(index + 1).padStart(4, '0')}-${label}.png`,
          );
          const result = {
            pageId: current.pageId,
            label,
            index: index + 1,
            path: current.path,
            png,
            elementCount: current.data.elements.length,
            types: Object.fromEntries(
              [...new Set(current.data.elements.map((element) => element.elementType))].map(
                (type) => [
                  type,
                  current.data.elements.filter((element) => element.elementType === type).length,
                ],
              ),
            ),
            passed: false,
            unsupported: [],
            formulaErrors: [],
            brokenImages: [],
          };
          try {
            if (!fullSnapshotUrl) {
              const rendered = await api('/render', { pageId: current.pageId });
              const id = new URL(rendered.url, url).pathname.split('/')[3];
              await browserPage.goto(`${url}/huandeng/export/${id}`, {
                waitUntil: 'networkidle',
                timeout: 120000,
              });
            }
            await browserPage.waitForFunction(
              () =>
                window.__HUANDENG_EXPORT_READY__ === true &&
                !document.querySelector('[data-hd-loading]'),
              undefined,
              { timeout: 60000 },
            );
            assert.equal(
              await browserPage.locator('[data-hd-export-error]').count(),
              0,
              await browserPage.locator('[data-hd-export-error]').allTextContents(),
            );
            const frames = browserPage.locator('[data-hd-export-page]');
            assert.equal(await frames.count(), fullSnapshotUrl ? snapshot.pages.length : 1);
            const frame = frames.nth(fullSnapshotUrl ? index : 0);
            assert.equal(await frame.getAttribute('data-hd-source-page'), current.pageId);
            await frame.scrollIntoViewIfNeeded();
            await frame.screenshot({ path: png, type: 'png', timeout: 60000 });
            result.unsupported = await frame
              .locator('[data-hd-unsupported="true"]')
              .evaluateAll((nodes) =>
                nodes.map((node) => ({
                  elementId: node
                    .closest('[data-hd-element-id]')
                    ?.getAttribute('data-hd-element-id'),
                  message: node.textContent ?? '',
                })),
              );
            result.formulaErrors = await frame.locator('[data-hd-formula-error]').allTextContents();
            result.brokenImages = await frame.locator('img').evaluateAll((images) =>
              images
                .filter((image) => !image.complete || image.naturalWidth === 0)
                .map((image) => ({
                  src: image.getAttribute('src'),
                  elementId: image
                    .closest('[data-hd-element-id]')
                    ?.getAttribute('data-hd-element-id'),
                })),
            );
            result.mathNodes = await frame.locator('math').count();
            result.chartNodes = await frame.locator('[data-hd-chart]').count();
            result.passed =
              !result.unsupported.length &&
              !result.formulaErrors.length &&
              !result.brokenImages.length;
            process.stdout.write(
              `${result.passed ? 'PASS' : 'FAIL'} export DOM page ${index + 1}/${snapshot.pages.length} ${label}\n`,
            );
          } catch (error) {
            result.error = errorRecord(error);
            const failureScreenshot = png.replace(/\.png$/, '.failure.png');
            result.failureScreenshot = failureScreenshot;
            await browserPage
              .screenshot({ path: failureScreenshot, fullPage: false })
              .catch(() => {});
          }
          pageResults.push(result);
        }
        assert.equal(
          pageResults.filter((result) => result.passed).length,
          snapshot.pages.length,
          'Some pages have rendering or resource errors; inspect per-page results and PNGs.',
        );
        assert.deepEqual(rendererErrors, []);
        await assertPageHashes(exportBaseline);
      },
    );

    await check('exports and all previews preserve every copied page byte', async () => {
      await assertPageHashes(exportBaseline);
    });

    await check(
      'record a named version, edit notes and restore only the first copied page',
      async () => {
        const before = await api('/session');
        const first = before.pages[0];
        const beforeHashes = await candidatePageHashes();
        const request = {
          requestId: randomUUID(),
          label: `Isolated acceptance ${new Date().toISOString()}`,
          expectedPageRevision: first.pageRevision,
          expectedMetadataRevision: before.metadataRevision,
          actor: 'isolated-real-project-v04',
        };
        const saved = await api(`/pages/${encodeURIComponent(first.pageId)}/checkpoints`, request);
        assert.equal(saved.kind, 'checkpoint');
        await assertPageHashes(beforeHashes);
        const recorded = await api(
          `/pages/${encodeURIComponent(first.pageId)}/versions/${encodeURIComponent(saved.versionId)}`,
        );
        const changedNotes = `${first.data.notes ?? ''}\n[Isolated acceptance notes ${randomUUID()}]`;
        await transaction([{ op: 'page.notes.set', pageId: first.pageId, text: changedNotes }]);
        assert.equal(
          (await api(`/pages/${encodeURIComponent(first.pageId)}`)).data.notes,
          changedNotes,
        );
        await assertPageHashes(beforeHashes, first.path);
        await transaction([
          { op: 'page.version.restore', pageId: first.pageId, versionId: saved.versionId },
        ]);
        const restored = await api(`/pages/${encodeURIComponent(first.pageId)}`);
        assert.equal(restored.pageId, first.pageId);
        assert.equal(restored.shortCode, first.shortCode);
        assert.equal(restored.metadata.label, first.metadata.label);
        assert.equal(restored.data.notes, first.data.notes);
        assert.deepEqual(restored.data, recorded.page.data);
        await assertPageHashes(beforeHashes, first.path);
        checkpointResult = {
          pageId: first.pageId,
          versionId: saved.versionId,
          notesRestored: true,
          siblingPagesUnchanged: true,
          restoredContentMatchesArchivedVersion: true,
        };
      },
    );
  } catch (error) {
    failures.push({ check: 'fatal', ...errorRecord(error) });
    process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  } finally {
    await browser?.close().catch(() => {});
    if (child && child.exitCode === null) child.kill('SIGTERM');
    if (sourceRoot) {
      const files = [];
      for (const record of sourceFiles.values()) {
        try {
          const current = await resolveSource(record.path);
          const finalSha256 = await hashFile(current);
          files.push({
            ...record,
            finalSha256,
            unchanged: record.readComplete && record.sha256 === finalSha256,
          });
        } catch (error) {
          files.push({ ...record, unchanged: false, verificationError: errorRecord(error) });
        }
      }
      sourceVerification = {
        unchanged: files.length > 0 && files.every((file) => file.unchanged),
        files,
      };
      if (!sourceVerification.unchanged)
        failures.push({
          check: 'original source integrity',
          message: 'One or more read source files changed or could not be verified.',
          files: files.filter((file) => !file.unchanged).map((file) => file.path),
        });
    }
    const types = {};
    for (const current of snapshot?.pages ?? [])
      for (const element of current.data.elements)
        types[element.elementType] = (types[element.elementType] ?? 0) + 1;
    const passed =
      !failures.length &&
      sourceVerification.unchanged &&
      pageResults.length === snapshot?.pages.length &&
      pageResults.every((page) => page.passed) &&
      !!exports.pdf &&
      !!exports.pptx &&
      !!checkpointResult;
    const report = {
      passed,
      startedAt,
      completedAt: new Date().toISOString(),
      sourceEntry,
      sourceRoot,
      sourceManifestSha256: sourceFiles.get(path.basename(sourceEntry ?? ''))?.sha256,
      sourceReadFilesUnchanged: sourceVerification.unchanged,
      sourceFiles: sourceVerification.files,
      sandbox,
      candidateEntry,
      pageCount: snapshot?.pages.length ?? 0,
      types,
      checks,
      pages: pageResults,
      exports,
      checkpoint: checkpointResult,
      rendererErrors,
      failures,
      serverLog: logs.slice(-80),
      evidence: runDirectory,
    };
    if (!sourceRoot || !inside(sourceRoot, reportRoot)) {
      await fs.mkdir(runDirectory, { recursive: true });
      const bytes = JSON.stringify(report, null, 2);
      await fs.writeFile(path.join(runDirectory, 'result.json'), bytes);
      await fs.writeFile(path.join(reportRoot, 'result.json'), bytes);
    }
    process.stdout.write(
      `${JSON.stringify({ passed, pageCount: report.pageCount, sourceReadFilesUnchanged: report.sourceReadFilesUnchanged, sourceFileCount: sourceFiles.size, checks: checks.length, evidence: runDirectory })}\n`,
    );
    if (!passed) process.exitCode = 1;
  }
}
