function fingerprint(target) {
  return target.url ? target.url + '\0' + (target.epoch ?? '') : undefined;
}

/** Owns route lifetimes. A mounted route does not prove that a model is working. */
export class ProjectRoutes {
  constructor({
    targets,
    mount,
    intervalMs = 5000,
    missingPolls = 3,
    strict = false,
    logger = console,
  }) {
    Object.assign(this, { targets, mount, intervalMs, missingPolls, strict, logger });
    this.routes = new Map();
    this.pending = undefined;
    this.stopped = false;
    this.timer = undefined;
    this.lastError = undefined;
  }
  refresh(initial = false) {
    if (this.pending) return this.pending;
    if (this.stopped) return Promise.resolve();
    const task = this.reconcile(initial);
    this.pending = task;
    void task
      .finally(() => {
        if (this.pending === task) this.pending = undefined;
      })
      .catch(() => {});
    return task;
  }
  async reconcile(initial) {
    let targets;
    try {
      targets = await this.targets();
      this.lastError = undefined;
    } catch (error) {
      if (initial && this.strict) throw error;
      if (this.lastError !== error.message)
        this.logger.warn('HUANDENG project discovery: ' + error.message);
      this.lastError = error.message;
      return;
    }
    if (this.stopped) return;
    const desired = new Map(targets.map((target) => [target.key, target]));
    for (const [key, route] of this.routes) {
      const target = desired.get(key);
      if (!target) {
        route.misses++;
        if (route.misses < this.missingPolls) continue;
        await route.handle.dispose();
        this.routes.delete(key);
        continue;
      }
      route.misses = 0;
      const next = fingerprint(target);
      if (next !== undefined && next !== fingerprint(route.target)) {
        await route.handle.dispose();
        this.routes.delete(key);
      }
    }
    if (this.stopped) return;
    const ready = [];
    for (const target of targets) {
      if (this.routes.has(target.key)) continue;
      const handle = this.mount(target);
      this.routes.set(target.key, { target, handle, misses: 0 });
      ready.push(
        Promise.resolve(handle.ready).catch(async (error) => {
          await handle.dispose();
          if (this.routes.get(target.key)?.handle === handle) this.routes.delete(target.key);
          throw error;
        }),
      );
    }
    const outcomes = await Promise.allSettled(ready);
    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') {
        if (initial && this.strict) throw outcome.reason;
        this.logger.warn('HUANDENG route startup: ' + String(outcome.reason));
      }
    }
  }
  async start() {
    await this.refresh(true);
    if (this.stopped) return;
    this.timer = setInterval(() => {
      void this.refresh().catch((error) =>
        this.logger.warn('HUANDENG route refresh: ' + error.message),
      );
    }, this.intervalMs);
    this.timer.unref?.();
  }
  async dispose() {
    if (this.stopped) return;
    this.stopped = true;
    clearInterval(this.timer);
    const outcomes = await Promise.allSettled(
      [...this.routes.values()].map((route) => route.handle.dispose()),
    );
    await this.pending?.catch(() => {});
    this.routes.clear();
    for (const outcome of outcomes)
      if (outcome.status === 'rejected')
        this.logger.warn('HUANDENG route cleanup: ' + String(outcome.reason));
  }
  snapshot() {
    return [...this.routes.values()].map(({ target, misses }) => ({ ...target, misses }));
  }
}
