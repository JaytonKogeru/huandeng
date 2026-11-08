import { Check, Copy, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { desktopHost } from '@/lib/huandeng-desktop';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

type AgentClient = 'deepseek' | 'codex' | 'claude' | 'chatgpt';
type Setup = { client: string; entryPath: string; pluginPath: string; configuration: string };

export function AgentConnectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useHuandengLocale();
  const [client, setClient] = useState<AgentClient>('chatgpt');
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    void retry;
    if (!open) return;
    let active = true;
    setSetup(null);
    setError(null);
    setCopied(false);
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
          if (active) setSetup(result);
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
  }, [open, client, retry]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-3rem)] flex-col overflow-y-auto sm:max-w-2xl"
        data-hd-agent-connection
      >
        <DialogHeader>
          <DialogTitle>{t('连接 Agent')}</DialogTitle>
          <DialogDescription>
            {t('Generate setup instructions for an external Agent to work with this Project.')}
          </DialogDescription>
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
        <p className="text-xs leading-relaxed text-muted-foreground">
          {client === 'chatgpt'
            ? t(
                'In ChatGPT, select your existing DC-WALT workstation and ask it to run these commands. No reverse proxy, public endpoint or new tunnel is created.',
              )
            : client === 'deepseek'
              ? t(
                  '将此配置保存为独立的 JSON patch，通过 dsh --patch 加载。保留现有模型与账户设置。',
                )
              : t('将配置片段合并到该客户端的 MCP 配置，保留已有设置。这里不会修改客户端配置。')}
        </p>
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
        {setup && (
          <>
            <p className="break-all text-xs text-muted-foreground" data-hd-agent-project>
              {setup.entryPath}
            </p>
            <Textarea
              readOnly
              value={setup.configuration}
              aria-label={t('连接配置')}
              className="min-h-44 resize-y font-mono text-xs"
              spellCheck={false}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t(
                'Keep this Project open. Copy these instructions into your client, then ask it to read the Story briefing. This screen generates configuration; it does not start or connect an Agent.',
              )}
            </p>
            <div className="flex items-center justify-end gap-2">
              {copied && (
                <span className="text-xs text-muted-foreground" role="status">
                  {t('已复制')}
                </span>
              )}
              <Button
                onClick={() =>
                  void navigator.clipboard.writeText(setup.configuration).then(
                    () => setCopied(true),
                    (failure) => setError(String(failure)),
                  )
                }
                data-hd-copy-agent-config
              >
                {copied ? <Check /> : <Copy />}
                {t('复制配置')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
