import { useEffect, useId, useState } from 'react';
import type { ExpectedRevisions, PageSnapshot, PptdOperation, Revision } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

export function DesignIntentPanel({
  page,
  metadataRevision,
  onApply,
  disabled,
}: {
  page: PageSnapshot;
  metadataRevision: Revision | null;
  onApply: (operations: PptdOperation[], expected?: ExpectedRevisions) => Promise<unknown>;
  disabled: boolean;
}) {
  const id = useId();
  const [purpose, setPurpose] = useState(page.metadata.designIntent?.purpose ?? '');
  const [keep, setKeep] = useState((page.metadata.designIntent?.keep ?? []).join('\n'));
  const [base, setBase] = useState(metadataRevision);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setPurpose(page.metadata.designIntent?.purpose ?? '');
    setKeep((page.metadata.designIntent?.keep ?? []).join('\n'));
    setBase(metadataRevision);
  }, [dirty, metadataRevision, page.metadata.designIntent]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onApply(
        [
          {
            op: 'metadata.patch',
            pageId: page.pageId,
            set: {
              'designIntent.purpose': purpose,
              'designIntent.keep': keep
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            },
          },
        ],
        { metadata: base },
      );
      setDirty(false);
      setMessage('作者意图已保存。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="space-y-3 border-b border-border px-4 py-4" open>
      <summary className="cursor-pointer text-xs font-medium">
        Huandeng Frame · 作者意图{dirty && <span className="ml-2 text-brand">未保存</span>}
      </summary>
      <label htmlFor={`${id}-purpose`} className="block space-y-1.5 text-xs text-muted-foreground">
        <span>这一页的科学问题</span>
        <Textarea
          id={`${id}-purpose`}
          aria-label="页面科学问题"
          value={purpose}
          disabled={disabled || saving}
          className="text-xs"
          onChange={(event) => {
            setPurpose(event.target.value);
            setDirty(true);
          }}
        />
      </label>
      <label htmlFor={`${id}-keep`} className="block space-y-1.5 text-xs text-muted-foreground">
        <span>保留什么 · 每行一条</span>
        <Textarea
          id={`${id}-keep`}
          aria-label="需要保留的设计意图"
          value={keep}
          disabled={disabled || saving}
          className="min-h-24 text-xs"
          onChange={(event) => {
            setKeep(event.target.value);
            setDirty(true);
          }}
        />
      </label>
      {dirty && base !== metadataRevision && (
        <p className="text-xs text-amber-700">注记已有新版本。当前输入已保留；保存会检查原版本。</p>
      )}
      {message && (
        <p role="status" className="text-[11px] leading-relaxed text-muted-foreground">
          {message}
        </p>
      )}
      <div className="flex gap-1.5">
        <Button size="xs" disabled={disabled || saving || !dirty} onClick={() => void save()}>
          保存作者意图
        </Button>
        {dirty && (
          <Button
            size="xs"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              setDirty(false);
              setMessage(null);
            }}
          >
            读取最新注记
          </Button>
        )}
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        科学问题与构图理由随页面提供给 Agent。该表单通过“保存作者意图”提交。
      </p>
    </details>
  );
}
