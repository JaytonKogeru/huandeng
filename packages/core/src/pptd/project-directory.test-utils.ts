import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { acquireWriterLock, canonicalProjectRoot } from './persistence';
import { PptdError } from './types';

export async function projectTestDirectory(prefix: string, projects = ['project']) {
  let unavailable: unknown;
  for (let attempt = 0; attempt < 32; attempt++) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    const stateDir = path.join(directory, '.fixture-lock-probe');
    try {
      const canonical = await canonicalProjectRoot(directory);
      // Synthetic fixtures can choose a root whose legacy lock port the OS permits.
      // The actual test still acquires the production lock; no writer is bypassed.
      for (const project of projects) {
        const release = await acquireWriterLock(path.resolve(canonical, project), stateDir);
        await release();
      }
      await fs.rm(stateDir, { recursive: true, force: true });
      return directory;
    } catch (error) {
      await fs.rm(directory, { recursive: true, force: true });
      if (
        !(error instanceof PptdError) ||
        error.code !== 'WRITER_LOCKED' ||
        !['EADDRINUSE', 'EACCES', 'EPERM'].includes(String(error.details.causeCode))
      )
        throw error;
      unavailable = error;
    }
  }
  throw new Error('Could not allocate a test project with an available writer lock.', {
    cause: unavailable,
  });
}
