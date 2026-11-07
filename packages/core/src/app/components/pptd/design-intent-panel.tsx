import { Pencil, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import type { ExpectedRevisions, PageSnapshot, PptdOperation, Revision } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

function intentText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

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
  const intent = page.metadata.designIntent;
  const [purpose, setPurpose] = useState(intent?.purpose ?? '');
  const [keep, setKeep] = useState((intent?.keep ?? []).join('\n'));
  const [base, setBase] = useState(metadataRevision);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestedChange = intentText(intent?.requestedChange);
  const actor = intentText(intent?.actor);
  const source = intentText(intent?.source);
  const recordedAt = intentText(intent?.recordedAt);
  const hasIntent = Boolean(intent?.purpose || intent?.keep?.length || requestedChange);

  useEffect(() => {
    if (dirty) return;
    setPurpose(intent?.purpose ?? '');
    setKeep((intent?.keep ?? []).join('\n'));
    setBase(metadataRevision);
  }, [dirty, metadataRevision, intent]);

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
              'designIntent.actor': 'user',
              'designIntent.source': 'HUANDING Editor',
              'designIntent.recordedAt': new Date().toISOString(),
            },
          },
        ],
        { metadata: base },
      );
      setDirty(false);
      setEditing(false);
      setMessage('意图更正已保存，Agent 会读取到这次更正。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="space-y-3 border-b border-border px-4 py-4"
      aria-label="HUANDING Story"
      data-hd-frame
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold tracking-wide">HUANDING Story</h3>
          <p className="mt-1 text-[10px] text-muted-foreground">Agent 记录的创作意图</p>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={editing ? '取消更正意图' : '更正意图'}
          title={editing ? '取消更正' : '更正意图'}
          disabled={disabled || saving}
          onClick={() => {
            setEditing((value) => !value);
            setDirty(false);
            setMessage(null);
          }}
        >
          {editing ? <X /> : <Pencil />}
        </Button>
      </div>
      {editing ? (
        <>
          <label
            htmlFor={`${id}-purpose`}
            className="block space-y-1.5 text-xs text-muted-foreground"
          >
            <span>这一页要表达什么</span>
            <Textarea
              id={`${id}-purpose`}
              aria-label="页面创作意图"
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
              className="min-h-20 text-xs"
              onChange={(event) => {
                setKeep(event.target.value);
                setDirty(true);
              }}
            />
          </label>
          {dirty && base !== metadataRevision && (
            <p className="text-xs text-amber-700">
              Agent 已更新意图。你的更正已保留，保存时会检查版本。
            </p>
          )}
          <div className="flex gap-1.5">
            <Button size="xs" disabled={disabled || saving || !dirty} onClick={() => void save()}>
              {saving ? '正在保存…' : '保存更正'}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setDirty(false);
                setEditing(false);
                setMessage(null);
              }}
            >
              取消
            </Button>
          </div>
        </>
      ) : hasIntent ? (
        <div className="space-y-3 text-xs leading-relaxed" data-hd-frame-content>
          {intent?.purpose && <p className="whitespace-pre-wrap">{intent.purpose}</p>}
          {Boolean(intent?.keep?.length) && (
            <div>
              <p className="mb-1 text-[10px] text-muted-foreground">需要保留</p>
              <ul className="list-disc space-y-1 pl-4">
                {intent?.keep?.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {requestedChange && (
            <div>
              <p className="mb-1 text-[10px] text-muted-foreground">这次修改</p>
              <p className="whitespace-pre-wrap">{requestedChange}</p>
            </div>
          )}
          {(actor || source || recordedAt) && (
            <p
              className="border-t border-border pt-2 text-[10px] text-muted-foreground"
              data-hd-frame-provenance
            >
              {actor === 'user' ? '你更正了意图' : actor || source}
              {source && source !== actor && actor !== 'user' && ` · ${source}`}
              {recordedAt && (
                <span className="mt-0.5 block">{new Date(recordedAt).toLocaleString()}</span>
              )}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Agent 尚未记录这页的意图。把任务交给外部 Agent
          后，它会先在这里记下目标、保留项和修改计划。
        </p>
      )}
      {message && (
        <p role="status" className="text-[11px] leading-relaxed text-muted-foreground">
          {message}
        </p>
      )}
      {!editing && (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          由 ChatGPT、Claude Code 或 Codex 通过项目接口维护；需要时可点击铅笔更正。
        </p>
      )}
    </section>
  );
}
