import { discoverSessions } from './discovery.mjs';
import { options, pluginRoot, reportError, resolveCore } from './runtime.mjs';

try {
  const values = options();
  if (values.help)
    process.stdout.write(
      'Usage: node discover.mjs [--install-dir <Editor directory>] [--cli <huandeng.js>] [--runtime-dir <absolute>]\nLists this local installed runtime and verified active Projects. No document writes or account connection.\n',
    );
  else {
    const environment = {
      ...process.env,
      ...(values['runtime-dir'] ? { HUANDENG_RUNTIME_DIR: values['runtime-dir'] } : {}),
    };
    let runtime;
    let runtimeError;
    try {
      runtime = await resolveCore(values, pluginRoot, environment);
    } catch (error) {
      runtimeError = error.message;
    }
    const projects = await discoverSessions(environment);
    process.stdout.write(
      `${JSON.stringify({ runtime, runtimeError, projects, requiresProjectChoice: projects.length > 1 }, null, 2)}\n`,
    );
    if (!runtime) process.exitCode = 1;
  }
} catch (error) {
  reportError(error);
}
