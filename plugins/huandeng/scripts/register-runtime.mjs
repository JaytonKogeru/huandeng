import fs from 'node:fs/promises';
import path from 'node:path';
import { installationAt, stateRoot } from './discovery.mjs';
import { options, reportError } from './runtime.mjs';

try {
  const values = options();
  if (values.help)
    process.stdout.write(
      'Usage: node register-runtime.mjs --install-dir <Editor directory> [--runtime-dir <absolute>]\nRecords a local installed Editor pointer for copied plugins. No Project or client configuration is changed.\n',
    );
  else {
    const installation = await installationAt(
      values['install-dir'] ?? process.env.HUANDENG_INSTALL_DIR,
    );
    const environment = {
      ...process.env,
      ...(values['runtime-dir'] ? { HUANDENG_RUNTIME_DIR: values['runtime-dir'] } : {}),
    };
    const directory = stateRoot(environment);
    await fs.mkdir(directory, { recursive: true });
    const destination = path.join(directory, 'agent-runtime.json');
    const contents = `${JSON.stringify({ schemaVersion: 1, application: installation.application }, null, 2)}\n`;
    let previous;
    try {
      previous = await fs.readFile(destination, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (previous !== contents) {
      if (previous) await fs.writeFile(`${destination}.previous`, previous, { mode: 0o600 });
      const temporary = `${destination}.${process.pid}.tmp`;
      await fs.writeFile(temporary, contents, { mode: 0o600 });
      try {
        await fs.rename(temporary, destination);
      } catch (error) {
        await fs.rm(temporary, { force: true });
        throw error;
      }
    }
    process.stdout.write(
      `${JSON.stringify({ ok: true, registration: destination, version: installation.version }, null, 2)}\n`,
    );
  }
} catch (error) {
  reportError(error);
}
