import { Bot } from 'lucide-react';
import deepseekIcon from '@/assets/agents/deepseek.ico';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { PageAgentActivity } from '../../../pptd/activity-presence';
import { type AgentFamily, agentFamilies } from '../../../pptd/agent-identity';
import { ProviderLogo } from '../agent/provider-logo';

export function AgentFamilyMark({ family }: { family: AgentFamily }) {
  if (family === 'chatgpt' || family === 'claude')
    return (
      <ProviderLogo
        provider={family === 'chatgpt' ? 'codex' : 'claude'}
        className="size-3.5 shrink-0"
      />
    );
  if (family === 'deepseek')
    return <img src={deepseekIcon} alt="" className="size-3.5 shrink-0 object-contain" />;
  return <Bot aria-hidden="true" className="size-3.5 shrink-0" />;
}

export function PageAgentStatus({
  items,
  compact = false,
  pinned = false,
  onOpen,
}: {
  items: readonly PageAgentActivity[];
  compact?: boolean;
  pinned?: boolean;
  onOpen: () => void;
}) {
  const { t, locale } = useHuandengLocale();
  if (!items.length) return null;
  const label = (item: PageAgentActivity) => {
    if (item.status !== 'running')
      return t(
        {
          planned: 'Planned',
          waiting: 'Waiting',
          completed: 'Completed',
          failed: 'Failed',
          cancelled: 'Stopped',
          stale: 'Not recently updated',
        }[item.status],
      );
    return t(
      item.phase
        ? {
            audit: 'Auditing',
            spec: 'Planning',
            implement: 'Editing',
            validate: 'Checking',
            release: 'Preparing delivery',
          }[item.phase]
        : 'Working',
    );
  };
  return (
    <fieldset
      className="hd-page-agent-status"
      data-hd-page-agent-status
      aria-label={t('Reported work on this slide')}
    >
      {pinned && !compact && <span className="hd-agent-main-label">{t('Main activity')}</span>}
      {items.slice(0, 3).map((item) => {
        const family =
          item.family === 'other'
            ? item.actor
            : (agentFamilies.find((entry) => entry.id === item.family)?.label ?? item.actor);
        const time = new Date(item.reportedAt).toLocaleTimeString(
          locale === 'zh-CN' ? 'zh-CN' : 'en',
          { hour: '2-digit', minute: '2-digit' },
        );
        const description = [
          `${family}: ${label(item)}`,
          item.actor !== family ? item.actor : '',
          t('Reported at {time}', { time }),
          item.summary,
          pinned ? t('Reports refer to Main; this fixed version is unchanged.') : '',
          item.savedOperationIds.length
            ? t('{count} verified saved changes', { count: item.savedOperationIds.length })
            : '',
        ]
          .filter(Boolean)
          .join('\n');
        return (
          <button
            key={item.key}
            type="button"
            className="hd-page-agent-badge"
            data-hd-agent-family={item.family}
            data-hd-agent-status={item.status}
            data-compact={compact || undefined}
            title={description}
            aria-label={description}
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            <AgentFamilyMark family={item.family} />
            {!compact && <span className="hd-agent-family-name">{family}</span>}
            {!compact && <span className="hd-agent-stage">{label(item)}</span>}
            {compact && <span className="hd-agent-status-dot" aria-hidden="true" />}
          </button>
        );
      })}
      {items.length > 3 && (
        <button
          type="button"
          className="hd-page-agent-badge"
          onClick={onOpen}
          aria-label={t('Show all {count} tasks', { count: items.length })}
        >
          +{items.length - 3}
        </button>
      )}
    </fieldset>
  );
}
