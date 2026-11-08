const defaults = {
  notesDock: 'bottom',
  notesHeight: 160,
  notesWidth: 320,
  navigationWidth: 288,
  inspectorWidth: 300,
  notesOpen: false,
  navigationCollapsed: false,
  inspectorCollapsed: false,
};

function normalizeWorkspaceLayout(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const next = { ...defaults, notesDock: source.notesDock === 'right' ? 'right' : 'bottom' };
  for (const [key, min, max] of [
    ['notesHeight', 96, 400],
    ['notesWidth', 240, 520],
    ['navigationWidth', 240, 440],
    ['inspectorWidth', 260, 460],
  ]) {
    if (typeof source[key] === 'number' && Number.isFinite(source[key]))
      next[key] = Math.round(Math.max(min, Math.min(max, source[key])));
  }
  for (const key of ['notesOpen', 'navigationCollapsed', 'inspectorCollapsed'])
    if (typeof source[key] === 'boolean') next[key] = source[key];
  return next;
}

function createWorkspaceLayoutWriter({ read, write }) {
  let clientId = null;
  let revision = -1;
  const validClient = (value) => typeof value === 'string' && /^[A-Za-z0-9-]{1,128}$/.test(value);
  return {
    open(nextClientId) {
      if (nextClientId !== undefined) {
        if (!validClient(nextClientId)) throw new Error('Invalid workspace layout client.');
        if (clientId !== nextClientId) {
          clientId = nextClientId;
          revision = -1;
        }
      }
      return normalizeWorkspaceLayout(read());
    },
    async save(update) {
      if (
        !update ||
        !validClient(update.clientId) ||
        !Number.isSafeInteger(update.revision) ||
        update.revision < 0 ||
        !update.layout ||
        typeof update.layout !== 'object' ||
        Array.isArray(update.layout)
      )
        throw new Error('Invalid workspace layout update.');
      if (update.clientId !== clientId || update.revision <= revision)
        return normalizeWorkspaceLayout(read());
      const result = await write(normalizeWorkspaceLayout(update.layout));
      if (clientId === update.clientId) revision = update.revision;
      return result;
    },
  };
}

module.exports = { normalizeWorkspaceLayout, createWorkspaceLayoutWriter };
