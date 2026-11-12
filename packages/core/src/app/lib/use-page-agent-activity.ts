import { useEffect, useMemo, useState } from 'react';
import type { ActivitySnapshot } from '../../pptd/activity';
import {
  activityFreshnessMs,
  activityStaleDisplayMs,
  activityTerminalDisplayMs,
  projectPageActivity,
} from '../../pptd/activity-presence';

export function usePageAgentActivity(
  snapshot: ActivitySnapshot | null,
  pageIds: readonly string[],
) {
  const [clock, setClock] = useState(Date.now);
  const activity = useMemo(
    () =>
      projectPageActivity(snapshot, {
        now: Math.max(clock, Date.now()),
        pageIds,
      }),
    [snapshot, clock, pageIds],
  );
  const nextUpdate = Math.min(
    ...Object.values(activity.byPage)
      .flat()
      .map(
        (item) =>
          Date.parse(item.reportedAt) +
          (item.status === 'stale'
            ? activityStaleDisplayMs
            : ['completed', 'failed', 'cancelled'].includes(item.status)
              ? activityTerminalDisplayMs
              : activityFreshnessMs),
      ),
  );
  useEffect(() => {
    if (!Number.isFinite(nextUpdate)) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.max(1, nextUpdate - Date.now() + 1));
    return () => clearTimeout(timer);
  }, [nextUpdate]);
  return activity;
}
