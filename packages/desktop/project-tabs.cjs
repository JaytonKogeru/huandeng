function createProjectTabs() {
  const projects = new Map();
  let activeId = null;
  return {
    get activeId() {
      return activeId;
    },
    get active() {
      return projects.get(activeId) ?? null;
    },
    list: () => [...projects.values()],
    get: (id) => projects.get(id) ?? null,
    find: (entryKey) => [...projects.values()].find((item) => item.entryKey === entryKey) ?? null,
    forContents: (id) =>
      [...projects.values()].find((item) => item.view.webContents.id === id) ?? null,
    add(project) {
      if (
        projects.has(project.id) ||
        [...projects.values()].some((item) => item.entryKey === project.entryKey)
      )
        throw new Error('This Project is already open.');
      projects.set(project.id, project);
      return project;
    },
    activate(id) {
      if (id !== null && !projects.has(id)) throw new Error('This Project tab is no longer open.');
      activeId = id;
      return projects.get(id) ?? null;
    },
    move(id, beforeId = null) {
      if (!projects.has(id) || (beforeId !== null && !projects.has(beforeId)))
        throw new Error('This Project tab is no longer open.');
      if (id === beforeId) return false;
      const previous = [...projects.keys()];
      const order = previous.filter((key) => key !== id);
      order.splice(beforeId === null ? order.length : order.indexOf(beforeId), 0, id);
      if (order.every((key, index) => key === previous[index])) return false;
      const items = order.map((key) => projects.get(key));
      projects.clear();
      for (const item of items) projects.set(item.id, item);
      return true;
    },
    remove(id) {
      const ids = [...projects.keys()];
      const position = ids.indexOf(id);
      if (position === -1) return null;
      const project = projects.get(id);
      projects.delete(id);
      if (activeId === id) activeId = ids[position + 1] ?? ids[position - 1] ?? null;
      return project;
    },
  };
}

function normalizeProjectTabLayout(value) {
  return {
    orientation: value?.orientation === 'vertical' ? 'vertical' : 'horizontal',
    collapsed: value?.collapsed === true,
  };
}

function updateProjectTabLayout(current, update) {
  if (
    !update ||
    typeof update !== 'object' ||
    Array.isArray(update) ||
    Object.keys(update).some((key) => key !== 'orientation' && key !== 'collapsed') ||
    ('orientation' in update && !['horizontal', 'vertical'].includes(update.orientation)) ||
    ('collapsed' in update && typeof update.collapsed !== 'boolean')
  )
    throw new Error('Invalid Project tab layout.');
  return { ...normalizeProjectTabLayout(current), ...update };
}

function contentBounds(width, height, presentation, stripHeight = 42, tabLayout = {}) {
  const layout = normalizeProjectTabLayout(tabLayout);
  const availableWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1));
  const availableHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1));
  const top = presentation ? 0 : Math.min(availableHeight - 1, stripHeight);
  const left =
    presentation || layout.orientation === 'horizontal'
      ? 0
      : Math.min(availableWidth - 1, layout.collapsed ? 52 : 224);
  return {
    x: left,
    y: top,
    width: availableWidth - left,
    height: availableHeight - top,
  };
}

function publicProjectTab(project) {
  return {
    id: project.id,
    title: project.service.title,
    entryPath: project.service.entryPath,
    readOnly: project.service.readOnly,
    dirty: project.state?.dirty === true,
    saving: project.state?.saving === true,
    attention: project.state?.attention === true,
    activity: project.state?.activity === true,
  };
}

function createFullscreenController({ getWindow, onSettled = () => {}, timeoutMs = 1500 }) {
  let pending = Promise.resolve();
  let uncertainWindow = null;
  const transition = async (fullscreen) => {
    const target = getWindow();
    if (!target || target.isDestroyed()) return false;
    if (target.isFullScreen() === fullscreen && uncertainWindow !== target) return fullscreen;
    return new Promise((resolve, reject) => {
      let settled = false;
      const event = fullscreen ? 'enter-full-screen' : 'leave-full-screen';
      const finish = (timedOut = false, error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        target.removeListener(event, changed);
        target.removeListener('closed', closed);
        uncertainWindow = timedOut ? target : null;
        onSettled();
        if (error) reject(error);
        else resolve(!target.isDestroyed() && target.isFullScreen());
      };
      const changed = () => finish();
      const closed = () => finish();
      const timer = setTimeout(() => finish(true), timeoutMs);
      target.once(event, changed);
      target.once('closed', closed);
      try {
        target.setFullScreen(fullscreen);
      } catch (error) {
        finish(false, error);
      }
    });
  };
  return {
    set(fullscreen) {
      if (typeof fullscreen !== 'boolean')
        return Promise.reject(new Error('Invalid fullscreen value.'));
      const result = pending.then(() => transition(fullscreen));
      // Exit requests wait for an in-flight entry, including requests made before its event arrives.
      pending = result.then(
        () => {},
        () => {},
      );
      return result;
    },
  };
}

function createRendererRecovery({ load, releasePresentation, rejectLeaves, onChanged, notify }) {
  const recovering = new Map();
  return {
    canFlush(project) {
      return Boolean(project && !project.rendererLost && !project.view.webContents.isDestroyed());
    },
    async lost(project, details) {
      if (project.disposing || project.rendererLost) return;
      project.rendererLost = true;
      project.rendererLossReason = details.reason;
      project.state = { ...project.state, saving: false, activity: false, attention: true };
      const message = `${project.service.title}: the renderer stopped (${details.reason}). Unsaved in-memory drafts may have been lost. Saved Project files have not been changed.`;
      rejectLeaves(project, message);
      // Ownership is released synchronously before waiting for the native fullscreen transition.
      const released = releasePresentation(project);
      onChanged(project, message);
      try {
        await released;
      } finally {
        notify(project, message);
      }
    },
    reload(project) {
      if (!project.rendererLost) return Promise.resolve();
      const previous = recovering.get(project.id);
      if (previous) return previous;
      const result = Promise.resolve()
        .then(async () => {
          await load(project);
          project.rendererLost = false;
          project.rendererLossReason = undefined;
          project.state = {
            ...project.state,
            dirty: false,
            saving: false,
            activity: false,
            attention: false,
          };
          onChanged(project);
        })
        .finally(() => recovering.delete(project.id));
      recovering.set(project.id, result);
      return result;
    },
  };
}

module.exports = {
  createProjectTabs,
  normalizeProjectTabLayout,
  updateProjectTabLayout,
  contentBounds,
  publicProjectTab,
  createFullscreenController,
  createRendererRecovery,
};
