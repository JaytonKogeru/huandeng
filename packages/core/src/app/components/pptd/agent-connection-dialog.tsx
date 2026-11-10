import { Check, Copy, Loader2, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { desktopHost } from '@/lib/huandeng-desktop';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend } from '@/lib/pptd-backend';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import {
  type AgentClient,
  type AgentSetup,
  agentConnectionSteps,
  agentFirstTask,
  agentProjectName,
} from './agent-connection-steps';
import { AgentReportEvidence } from './agent-report-evidence';

export function AgentSetupInstructions({
  client,
  setup,
  projectTitle,
  deckId,
  copied,
  onCopy,
}: {
  client: AgentClient;
  setup: AgentSetup;
  projectTitle?: string;
  deckId?: string;
  copied: 'configuration' | 'task' | null;
  onCopy: (text: string, kind: 'configuration' | 'task') => void;
}) {
  const { t } = useHuandengLocale();
  const firstTask = agentFirstTask(t, setup.entryPath, deckId);
  return (
    <>
      <section className="space-y-2 rounded-md border bg-muted/30 p-3" data-hd-agent-project>
        <p className="text-xs text-muted-foreground">{t('Project for this configuration')}</p>
        <h3 className="break-words text-base font-semibold">
          {agentProjectName(projectTitle, setup.entryPath)}
        </h3>
        <p className="break-all text-xs text-muted-foreground">{setup.entryPath}</p>
        <p className="text-xs leading-relaxed">
          {t(
            'An existing Agent session stays bound to its configured Project when you switch editor tabs. To change Projects, update the client configuration and reconnect explicitly.',
          )}
        </p>
      </section>
      <section className="space-y-3" data-hd-agent-next-steps>
        <h3 className="text-sm font-medium">{t('Next steps')}</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {agentConnectionSteps[client].map((step) => (
            <li key={step}>{t(step)}</li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => onCopy(setup.configuration, 'configuration')}
            data-hd-copy-agent-config
          >
            {copied === 'configuration' ? <Check /> : <Copy />}
            {t('复制配置')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onCopy(firstTask, 'task')}
            data-hd-copy-agent-task
          >
            {copied === 'task' ? <Check /> : <Copy />}
            {t('Copy first task')}
          </Button>
          {copied && (
            <span className="text-xs text-muted-foreground" role="status">
              {t(copied === 'task' ? 'First task copied' : '已复制')}
            </span>
          )}
        </div>
        <p data-hd-agent-setup-ready className="text-xs text-muted-foreground">
          {t('Instructions ready · connection not verified here')}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            'Keep this Project open. Copying does not change client settings or connect an Agent.',
          )}
        </p>
        {client === 'chatgpt' && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              'ChatGPT uses the existing workstation connection; this does not create a public endpoint or a new tunnel.',
            )}
          </p>
        )}
      </section>
      <details className="rounded-md border p-3" data-hd-agent-advanced>
        <summary className="cursor-pointer text-sm font-medium">
          {t('Advanced · configuration details')}
        </summary>
        <div className="mt-3 space-y-3">
          <Textarea
            readOnly
            value={setup.configuration}
            aria-label={t('连接配置')}
            className="min-h-44 resize-y font-mono text-xs"
            spellCheck={false}
          />
          <p className="text-xs font-medium">{t('First task')}</p>
          <p
            className="whitespace-pre-wrap break-words text-xs leading-relaxed"
            data-hd-agent-first-task
          >
            {firstTask}
          </p>
        </div>
      </details>
    </>
  );
}

export function AgentConnectionDialog({
  open,
  onOpenChange,
  backend,
  deckId,
  projectTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backend?: PptdBackend;
  deckId?: string;
  projectTitle?: string;
}) {
  const { t } = useHuandengLocale();
  const [client, setClient] = useState<AgentClient>('chatgpt');
  const requestKey = `${deckId ?? ''}/${client}`;
  const [setup, setSetup] = useState<{ requestKey: string; value: AgentSetup } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'configuration' | 'task' | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    void retry;
    if (!open) return;
    let active = true;
    setSetup(null);
    setError(null);
    setCopied(null);
    const host = desktopHost();
    if (!host?.getAgentConfiguration) {
      setLoading(false);
      setError('请在桌面版中打开项目，以生成本机 Agent 配置。');
      return;
    }
    setLoading(true);
    void host
      .getAgentConfiguration(client)
      .then(
        (result) => {
          if (active) setSetup({ requestKey, value: result });
        },
        (failure) => {
          if (active) setError(failure instanceof Error ? failure.message : String(failure));
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, client, retry, requestKey]);
  const currentSetup = setup?.requestKey === requestKey ? setup.value : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-3rem)] flex-col overflow-y-auto sm:max-w-2xl"
        data-hd-agent-connection
        showCloseButton={false}
      >
        <DialogClose
          aria-label={t('关闭')}
          className="absolute top-3.5 right-3.5 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <X className="size-3.5" />
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{t('连接 Agent')}</DialogTitle>
          <DialogDescription>{t('Set up your assistant for this Project.')}</DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-3 text-sm">
          <span>{t('客户端')}</span>
          <select
            value={client}
            onChange={(event) => setClient(event.target.value as AgentClient)}
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2"
            aria-label={t('Agent 客户端')}
          >
            <option value="deepseek">DeepSeek Harness</option>
            <option value="codex">Codex</option>
            <option value="claude">Claude Code</option>
            <option value="chatgpt">ChatGPT · DC-WALT</option>
          </select>
        </label>
        {loading && (
          <div className="flex items-center gap-2 text-sm" role="status">
            <Loader2 className="size-4 animate-spin" />
            {t('正在生成连接配置…')}
          </div>
        )}
        {error && (
          <div
            className="space-y-2 rounded-md border border-destructive/30 p-3 text-sm"
            role="alert"
          >
            <p className="break-words">{t(error)}</p>
            <Button size="sm" variant="outline" onClick={() => setRetry((value) => value + 1)}>
              <RefreshCw />
              {t('重试')}
            </Button>
          </div>
        )}
        {currentSetup && (
          <AgentSetupInstructions
            key={requestKey}
            client={client}
            setup={currentSetup}
            projectTitle={projectTitle}
            deckId={deckId}
            copied={copied}
            onCopy={(text, kind) => {
              setCopied(null);
              void navigator.clipboard.writeText(text).then(
                () => setCopied(kind),
                (failure) => setError(String(failure)),
              );
            }}
          />
        )}
        {open && backend && deckId && <AgentReportEvidence backend={backend} deckId={deckId} />}
      </DialogContent>
    </Dialog>
  );
}
