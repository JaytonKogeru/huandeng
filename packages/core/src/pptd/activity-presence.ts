import type { ActivityEvent, ActivitySnapshot, ActivityStatus } from './activity';
import { type ActivityPhase, type AgentFamily, inferAgentFamily } from './agent-identity';

export const activityFreshnessMs = 5 * 60 * 1000;
export const activityTerminalDisplayMs = 2 * 60 * 1000;
export const activityStaleDisplayMs = 30 * 60 * 1000;

export interface PageAgentActivity {
  key: string;
  sessionId: string;
  taskId: string;
  actor: string;
  family: AgentFamily;
  status: ActivityStatus | 'stale';
  phase?: ActivityPhase;
  reportedAt: string;
  ageMs: number;
  summary: string;
  previousSession: boolean;
  savedOperationIds: string[];
}

export interface ProjectPageActivity {
  byPage: Record<string, PageAgentActivity[]>;
  activeTaskCount: number;
  staleTaskCount: number;
}

interface TaskReport {
  event: ActivityEvent;
  pageIds: string[];
  operationIds: string[];
  agentFamily?: AgentFamily;
  phase?: ActivityPhase;
}

export function projectPageActivity(
  snapshot: ActivitySnapshot | null | undefined,
  options: { now?: number; pageIds?: readonly string[] } = {},
): ProjectPageActivity {
  const result: ProjectPageActivity = {
    byPage: Object.create(null),
    activeTaskCount: 0,
    staleTaskCount: 0,
  };
  if (!snapshot || snapshot.storageError) return result;
  const now = options.now ?? Date.now();
  const currentPages = options.pageIds ? new Set(options.pageIds) : null;
  const tasks = new Map<string, TaskReport>();
  const savedPages = new Map<string, Set<string>>();
  for (const event of [...snapshot.events].sort((a, b) => a.sequence - b.sequence)) {
    if (event.deckId !== snapshot.deckId) continue;
    if (event.source === 'writer') {
      if (event.status === 'completed' && event.operationId) {
        const pages = savedPages.get(event.operationId) ?? new Set<string>();
        for (const pageId of event.pageIds ?? []) pages.add(pageId);
        savedPages.set(event.operationId, pages);
      }
      continue;
    }
    const key = JSON.stringify([event.sessionId, event.taskId]);
    const prior = tasks.get(key);
    const previous = prior?.event.epoch === event.epoch ? prior : undefined;
    tasks.set(key, {
      event,
      pageIds: event.pageIds ?? previous?.pageIds ?? [],
      operationIds: event.operationIds ?? previous?.operationIds ?? [],
      agentFamily: event.agentFamily ?? previous?.agentFamily,
      phase: event.phase,
    });
  }
  for (const [key, task] of tasks) {
    const event = task.event;
    const timestamp = Date.parse(event.timestamp);
    if (!Number.isFinite(timestamp) || timestamp > now + 60_000) continue;
    const ageMs = Math.max(0, now - timestamp);
    const previousSession = event.epoch !== snapshot.epoch;
    const terminal = ['completed', 'failed', 'cancelled'].includes(event.status);
    const stale = !terminal && (previousSession || ageMs >= activityFreshnessMs);
    if (terminal ? ageMs >= activityTerminalDisplayMs : ageMs >= activityStaleDisplayMs) continue;
    const pageIds = [...new Set(task.pageIds)].filter(
      (id) => !currentPages || currentPages.has(id),
    );
    if (!pageIds.length) continue;
    if (stale) result.staleTaskCount++;
    else if (!terminal && event.status !== 'planned') result.activeTaskCount++;
    const value: Omit<PageAgentActivity, 'savedOperationIds'> = {
      key,
      sessionId: event.sessionId,
      taskId: event.taskId,
      actor: event.actor,
      family: inferAgentFamily(event.actor, task.agentFamily),
      status: stale ? 'stale' : event.status,
      ...(task.phase ? { phase: task.phase } : {}),
      reportedAt: event.timestamp,
      ageMs,
      summary: event.summary,
      previousSession,
    };
    for (const pageId of pageIds) {
      result.byPage[pageId] ??= [];
      result.byPage[pageId].push({
        ...value,
        savedOperationIds: [...new Set(task.operationIds)].filter((id) =>
          savedPages.get(id)?.has(pageId),
        ),
      });
    }
  }
  for (const entries of Object.values(result.byPage)) {
    entries.sort((a, b) => {
      const rank = (entry: PageAgentActivity) =>
        entry.status === 'running'
          ? 0
          : entry.status === 'waiting'
            ? 1
            : entry.status === 'stale'
              ? 3
              : 2;
      return (
        rank(a) - rank(b) || b.reportedAt.localeCompare(a.reportedAt) || a.key.localeCompare(b.key)
      );
    });
  }
  return result;
}
