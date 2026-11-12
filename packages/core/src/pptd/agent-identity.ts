export const agentFamilies = [
  { id: 'chatgpt', label: 'ChatGPT / Codex', availability: 'supported' },
  { id: 'claude', label: 'Claude / Claude Code', availability: 'supported' },
  { id: 'deepseek', label: 'DeepSeek Harness', availability: 'supported' },
  { id: 'pi', label: 'pi', availability: 'reserved' },
  { id: 'zcode', label: 'Zcode / GLM', availability: 'reserved' },
  { id: 'workbuddy', label: 'WorkBuddy', availability: 'reserved' },
  { id: 'grok', label: 'Grokbot / Grok', availability: 'reserved' },
  { id: 'gemini', label: 'Gemini', availability: 'reserved' },
  { id: 'antigravity', label: 'Antigravity', availability: 'reserved' },
  { id: 'hermes', label: 'Hermes', availability: 'reserved' },
  { id: 'other', label: 'Other agent', availability: 'other' },
] as const;

export type AgentFamily = (typeof agentFamilies)[number]['id'];

export const activityPhases = ['audit', 'spec', 'implement', 'validate', 'release'] as const;
export type ActivityPhase = (typeof activityPhases)[number];

export function isAgentFamily(value: unknown): value is AgentFamily {
  return typeof value === 'string' && agentFamilies.some((family) => family.id === value);
}

export function isActivityPhase(value: unknown): value is ActivityPhase {
  return typeof value === 'string' && activityPhases.some((phase) => phase === value);
}

export function inferAgentFamily(actor: string, explicit?: AgentFamily): AgentFamily {
  if (isAgentFamily(explicit)) return explicit;
  const name = actor.trim();
  if (/^(?:chatgpt|codex)(?:\b|[_-])/i.test(name)) return 'chatgpt';
  if (/^claude(?:[ -]?code)?(?:\b|[_-])/i.test(name)) return 'claude';
  if (/^deepseek(?:[ -]?harness)?(?:\b|[_-])/i.test(name)) return 'deepseek';
  return 'other';
}
