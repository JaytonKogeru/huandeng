import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mcp from '@deepseek-ai/dsh-mcp-client';
import * as skills from '@deepseek-ai/dsh-skill-filesystem';
import z from '@deepseek-ai/schemastery';
import { discoverSessions, loopbackOrigin } from '../vendor/scripts/discovery.mjs';
import { ProjectRoutes } from './controller.mjs';
import {
  launcherEnvironment,
  normalizeConfig,
  projectTargets,
  serverNamePattern,
} from './projects.mjs';

export const name = 'huandeng';
export const inject = [];
export const Config = z.object({
  entry: z.string(),
  entries: z.array(String),
  serverName: z.string().pattern(serverNamePattern).default('huandeng'),
  bindAllOpen: z.boolean().default(true),
  refreshIntervalMs: z.number().step(1).min(1000).max(60000).default(5000),
  missingPolls: z.number().step(1).min(1).max(12).default(3),
  runtimeDir: z.string(),
  installDir: z.string(),
  cli: z.string(),
  url: z.string(),
  skillProviderName: z.string().default('huandeng'),
  includeDefaultSkillRoots: z.boolean().default(false),
  toolCallTimeoutMs: z.number().step(1).min(1000).default(240000),
  reconnectMaxAttempts: z.number().step(1).min(1).max(10000).default(240),
  failOnStartupError: z.boolean().default(false),
  strictDiscovery: z.boolean().default(false),
});

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const launcher = path.join(packageRoot, 'vendor', 'scripts', 'launch-mcp.mjs');

export async function apply(ctx, raw = {}) {
  const config = normalizeConfig(raw);
  if (config.url) config.url = loopbackOrigin(config.url);
  const routes = new ProjectRoutes({
    targets: () => projectTargets(config, discoverSessions),
    mount: (target) => {
      const fiber = ctx.plugin(mcp, {
        transport: 'stdio',
        serverName: target.serverName,
        command: process.execPath,
        args: [launcher],
        cwd: packageRoot,
        env: launcherEnvironment(config, target),
        toolCallTimeoutMs: config.toolCallTimeoutMs,
        failOnStartupError: config.failOnStartupError,
        reconnect: {
          enabled: true,
          initialDelayMs: 500,
          maxDelayMs: 15000,
          maxAttempts: config.reconnectMaxAttempts,
        },
      });
      return { ready: Promise.resolve(fiber), dispose: () => fiber.dispose() };
    },
    intervalMs: config.refreshIntervalMs,
    missingPolls: config.missingPolls,
    strict: config.strictDiscovery || config.failOnStartupError,
    logger: ctx.logger,
  });
  ctx.effect(() => () => routes.dispose(), 'huandeng.project-routes');
  ctx.plugin(skills, {
    providerName: config.skillProviderName,
    includeDefaultRoots: config.includeDefaultSkillRoots ?? false,
    customSkillDirs: [path.join(packageRoot, 'vendor', 'skills')],
    watch: true,
  });
  await routes.start();
}
