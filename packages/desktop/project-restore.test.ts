import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createProjectRestore, createNavigationController } = require('./project-restore.cjs');
const entries = ['a', 'b', 'c'].map((entryPath) => ({ entryPath }));

function fixture() {
  let release!: () => void;
  let held!: () => void;
  const loading = new Promise<void>((resolve) => {
    held = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let active: string | null = null;
  const opened = new Set<string>();
  const calls: { entry: string; activate?: boolean | (() => boolean) }[] = [];
  const errors: string[] = [];
  const restorer = createProjectRestore({
    schedule: (action: () => unknown) => Promise.resolve().then(action),
    loadProject: async (entry: string, options: { activate?: boolean | (() => boolean) }) => {
      calls.push({ entry, activate: options.activate });
      if (entry === 'c' && options.activate === false) {
        held();
        await gate;
      }
      if (entry === 'bad') throw new Error('Missing project');
      opened.add(entry);
      if (typeof options.activate === 'function' ? options.activate() : options.activate !== false)
        active = entry;
    },
    showHome: () => {
      active = null;
    },
    onError: (error: Error) => errors.push(error.message),
  });
  return {
    restorer,
    opened,
    calls,
    errors,
    loading,
    release,
    get active() {
      return active;
    },
    choose(value: string | null) {
      restorer.interrupt();
      active = value;
    },
  };
}

describe('desktop startup restoration', () => {
  it('loads background projects without selecting them and restores the saved selection once', async () => {
    const f = fixture();
    const pending = f.restorer.run({ projects: entries, entry: 'a', readOnly: true });
    await f.loading;
    expect(f.active).toBe(null);
    expect(f.calls.every((call) => call.activate === false)).toBe(true);
    f.release();
    await pending;
    expect(f.active).toBe('a');
    expect(f.calls).toHaveLength(4);
  });

  it.each(['b', null])(
    'keeps an explicit selection made during a pending load: %s',
    async (selection) => {
      const f = fixture();
      const pending = f.restorer.run({ projects: entries, entry: 'a' });
      await f.loading;
      f.choose(selection);
      expect(f.active).toBe(selection);
      f.release();
      await pending;
      expect(f.active).toBe(selection);
      expect(f.calls).toHaveLength(3);
    },
  );

  it('does not reopen the saved target after the user closes it', async () => {
    const f = fixture();
    const pending = f.restorer.run({ projects: entries, entry: 'a' });
    await f.loading;
    f.choose('b');
    f.opened.delete('a');
    f.release();
    await pending;
    expect(f.opened.has('a')).toBe(false);
    expect(f.active).toBe('b');
  });

  it('honors the latest B then Home choice and an intent received before restoration starts', async () => {
    const f = fixture();
    f.choose('b');
    f.choose(null);
    const pending = f.restorer.run({ projects: entries, entry: 'a' });
    await f.loading;
    f.release();
    await pending;
    expect(f.active).toBe(null);
    expect(f.calls).toHaveLength(3);
  });

  it('continues after a failed background project without replacing the user selection', async () => {
    const f = fixture();
    const pending = f.restorer.run({ projects: [...entries, { entryPath: 'bad' }], entry: 'a' });
    await f.loading;
    f.choose('b');
    f.release();
    await pending;
    expect(f.active).toBe('b');
    expect(f.errors).toEqual(['Missing project']);
  });

  it('checks user intent again after the final saved target finishes loading', async () => {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const loading = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let active = 'b';
    const restorer = createProjectRestore({
      schedule: (action: () => unknown) => Promise.resolve().then(action),
      loadProject: async (entry: string, options: { activate: () => boolean }) => {
        entered();
        await gate;
        if (options.activate()) active = entry;
      },
      showHome: () => {
        active = 'home';
      },
    });
    const pending = restorer.run({ projects: [], entry: 'a' });
    await loading;
    restorer.interrupt();
    active = 'c';
    release();
    await pending;
    expect(active).toBe('c');
  });

  it('stops scheduling unopened projects when the window is closing', async () => {
    const f = fixture();
    const pending = f.restorer.run({ projects: [...entries, { entryPath: 'd' }], entry: 'a' });
    await f.loading;
    f.restorer.stop();
    f.release();
    await pending;
    expect(f.calls.map((call) => call.entry)).toEqual(['a', 'b', 'c']);
    expect(f.active).toBe(null);
  });
});

describe('desktop navigation intent', () => {
  function navigationFixture() {
    let queue: Promise<unknown> = Promise.resolve();
    let accepted = 0;
    const navigation = createNavigationController({
      schedule: (action: () => unknown) => {
        queue = queue.catch(() => {}).then(action);
        return queue;
      },
      onIntent: () => {
        accepted++;
      },
    });
    return { navigation, accepted: () => accepted };
  }

  it.each(['b', null])(
    'keeps a later selection while an explicit open is pending: %s',
    async (selection) => {
      const { navigation } = navigationFixture();
      let release!: () => void;
      let entered!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const loading = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let active: string | null = 'a';
      const opened: string[] = [];
      const pending = navigation.run(async () => {
        const activation = navigation.activation();
        entered();
        await gate;
        for (const entry of ['q', 'r']) {
          opened.push(entry);
          if (activation()) active = entry;
        }
      });
      await loading;
      await navigation.now(() => {
        active = selection;
      });
      release();
      await pending;
      expect(opened).toEqual(['q', 'r']);
      expect(active).toBe(selection);
    },
  );

  it('captures queued requests on receipt and reuses an early OS request without renewing intent', async () => {
    const f = navigationFixture();
    let active = 'a';
    const early = f.navigation.capture();
    await f.navigation.now(() => {
      active = 'b';
    });
    let opened = false;
    await f.navigation.runCaptured(early, async () => {
      const activation = f.navigation.activation();
      await Promise.resolve();
      opened = true;
      if (activation()) active = 'q';
    });
    expect(opened).toBe(true);
    expect(active).toBe('b');
    expect(f.accepted()).toBe(2);
  });

  it('restores the serialized action context after a failed open', async () => {
    const { navigation } = navigationFixture();
    await expect(
      navigation.run(async () => {
        throw new Error('load failed');
      }),
    ).rejects.toThrow('load failed');
    let current = false;
    await navigation.run(async () => {
      current = navigation.activation()();
    });
    expect(current).toBe(true);
  });
});
