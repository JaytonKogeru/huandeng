import { type ActivityEvent, type ActivitySnapshot, validateActivityReport } from './activity';
import type { HuandengClient } from './client';

export interface ActivityReportResult extends ActivityEvent {
  compatibility?: { omittedFields: ('agentFamily' | 'phase')[] };
}

export async function reportActivity(
  client: Pick<HuandengClient, 'request'>,
  value: unknown,
): Promise<ActivityReportResult> {
  const deckId =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).deckId
      : undefined;
  const report = validateActivityReport(value, typeof deckId === 'string' ? deckId : '');
  if (!report.agentFamily && !report.phase) return client.request('/activity', report);
  const snapshot = await client.request<ActivitySnapshot>('/activity');
  if (snapshot.deckId !== report.deckId)
    throw new Error('Activity belongs to a different Project.');
  const omittedFields: ('agentFamily' | 'phase')[] = [];
  if (report.agentFamily && snapshot.reportCapabilities?.agentFamily !== true) {
    delete report.agentFamily;
    omittedFields.push('agentFamily');
  }
  if (report.phase && snapshot.reportCapabilities?.phase !== true) {
    delete report.phase;
    omittedFields.push('phase');
  }
  const event = await client.request<ActivityEvent>('/activity', report);
  return {
    ...event,
    ...(omittedFields.length ? { compatibility: { omittedFields } } : {}),
  };
}
