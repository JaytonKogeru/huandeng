import { FileText, RefreshCw } from 'lucide-react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type { ProjectAuthoringGuidance } from '../../../pptd/types';
import { Button } from '../ui/button';

interface ProjectRulesProps {
  guidance?: ProjectAuthoringGuidance;
  onOpenFile: (path: string) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

const unavailableReasons = {
  'linked-file': 'Linked AGENTS.md files are not read.',
  'not-regular-file': 'AGENTS.md is not a regular file.',
  'path-mismatch': 'AGENTS.md does not resolve to the Project root.',
  'file-too-large': 'AGENTS.md exceeds the guidance size limit. Open the file to read it.',
  'changed-during-read': 'AGENTS.md changed while it was being read.',
  'invalid-utf8': 'AGENTS.md is not valid UTF-8 text.',
  'read-error': 'AGENTS.md could not be read.',
} as const;

export function ProjectRules({
  guidance,
  onOpenFile,
  onRefresh,
  refreshing = false,
}: ProjectRulesProps) {
  useHuandengLocale();
  const available = guidance?.status === 'available';
  const missing = guidance?.status === 'missing';

  return (
    <section
      aria-label={t('Project rules')}
      className="space-y-2 border-b border-border p-3 text-xs"
      data-hd-project-rules
      data-status={guidance?.status ?? 'unavailable'}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <FileText className="size-3.5" />
          {t('Project rules')}
        </h2>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('Refresh Project rules')}
          title={t('Refresh Project rules')}
          disabled={refreshing}
          onClick={onRefresh}
          data-hd-refresh-project-rules
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {t('Source: AGENTS.md at the Project root')}
      </p>
      {available ? (
        <>
          {guidance.text ? (
            <pre
              className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/20 p-2 font-sans text-[11px] leading-relaxed"
              data-hd-project-rules-text
            >
              {guidance.text}
            </pre>
          ) : (
            <p className="leading-relaxed text-muted-foreground">{t('AGENTS.md is empty.')}</p>
          )}
          {guidance.truncated && (
            <p role="status" className="text-[11px] leading-relaxed text-muted-foreground">
              {t('Only part of AGENTS.md is shown here. Open the file to read the full text.')}
            </p>
          )}
        </>
      ) : (
        <p
          role={missing ? 'status' : 'alert'}
          className="text-[11px] leading-relaxed text-muted-foreground"
        >
          {missing
            ? t('No AGENTS.md was found at the Project root.')
            : guidance?.reason
              ? t(unavailableReasons[guidance.reason])
              : t('Project rules are unavailable in the current snapshot.')}
        </p>
      )}
      <Button
        variant="outline"
        size="xs"
        className="w-full"
        disabled={missing}
        onClick={() => onOpenFile('AGENTS.md')}
        data-hd-open-project-rules
      >
        {t('Open AGENTS.md')}
      </Button>
    </section>
  );
}
