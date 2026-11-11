function createProjectRestore({ schedule, loadProject, showHome, onError = () => {} }) {
  let interrupted = false;
  let stopped = false;
  return {
    interrupt() {
      interrupted = true;
    },
    stop() {
      interrupted = true;
      stopped = true;
    },
    async run({ projects, entry, readOnly }) {
      for (const item of projects.slice(0, 12)) {
        if (stopped) break;
        if (typeof item?.entryPath !== 'string') continue;
        await schedule(() =>
          loadProject(item.entryPath, { readOnly: item.readOnly === true, activate: false }),
        ).catch(onError);
      }
      return schedule(() => {
        if (interrupted) return;
        return entry ? loadProject(entry, { readOnly, activate: () => !interrupted }) : showHome();
      });
    },
  };
}

function createNavigationController({ schedule, onIntent = () => {} }) {
  let generation = 0;
  let actionActivation = () => true;
  function capture() {
    onIntent();
    const intent = ++generation;
    return () => intent === generation;
  }
  function runCaptured(activation, action) {
    return schedule(async () => {
      const previous = actionActivation;
      actionActivation = activation;
      try {
        return await action(activation);
      } finally {
        actionActivation = previous;
      }
    });
  }
  return {
    capture,
    runCaptured,
    activation: () => actionActivation,
    run: (action) => runCaptured(capture(), action),
    now(action) {
      const activation = capture();
      return Promise.resolve().then(() => (activation() ? action(activation) : undefined));
    },
  };
}

module.exports = { createProjectRestore, createNavigationController };
