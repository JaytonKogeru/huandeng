import { useId, useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import {
  browserFontLibrarySource,
  FONT_PRESET_GROUPS,
  FONT_PRESETS,
  type FontAvailability,
  type FontLibrarySnapshot,
  fontAvailability,
  fontPresetForStack,
  readFontLibrary,
} from '@/lib/pptd-font-catalog';
import { Button } from '../ui/button';

export function FontPresetSelect({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (stack: string) => void;
}) {
  const { t } = useHuandengLocale();
  const id = useId();
  const selected = fontPresetForStack(value);
  return (
    <label htmlFor={id} className="block space-y-1.5 text-xs text-muted-foreground">
      <span>{t(label)}</span>
      <select
        id={id}
        aria-label={t(label)}
        data-hd-font-presets
        value={selected?.family ?? ''}
        disabled={disabled}
        className="h-8 w-full min-w-0 rounded border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={(event) => event.stopPropagation()}
        onChange={(event) => {
          const preset = FONT_PRESETS.find((font) => font.family === event.target.value);
          if (preset && preset.stack !== value) onChange(preset.stack);
        }}
      >
        {!selected && <option value="">{t('Custom font stack')}</option>}
        {FONT_PRESET_GROUPS.map((group) => (
          <optgroup key={group.label} label={t(group.label)}>
            {group.fonts.map((font) => (
              <option key={font.family} value={font.family}>
                {font.family}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

const STATUS_LABELS: Record<FontAvailability, string> = {
  installed: 'Installed locally',
  loaded: 'Loaded in this editor',
  generic: 'System font family',
  missing: 'Not found on this computer',
  unverified: 'Availability not verified',
};

export function FontLibrary() {
  const { t } = useHuandengLocale();
  const [stack, setStack] = useState(FONT_PRESETS[0].stack);
  const [snapshot, setSnapshot] = useState<FontLibrarySnapshot>();
  const [checking, setChecking] = useState(false);
  const selected = fontPresetForStack(stack) ?? FONT_PRESETS[0];
  const status = fontAvailability(selected, snapshot);
  const check = async () => {
    setChecking(true);
    try {
      setSnapshot(await readFontLibrary(browserFontLibrarySource()));
    } catch {
      setSnapshot({ access: 'failed', installedFamilies: [], loadedFamilies: [] });
    } finally {
      setChecking(false);
    }
  };
  const accessMessage = !snapshot
    ? 'Check local fonts to verify which presets are available.'
    : snapshot.access === 'granted'
      ? 'Local font list checked. Availability applies to this computer.'
      : snapshot.access === 'denied'
        ? 'Font access was not allowed. Unverified fonts are not marked as missing.'
        : snapshot.access === 'unsupported'
          ? 'This environment cannot list local fonts. Availability remains unverified.'
          : 'The local font check could not finish. Try checking again.';
  return (
    <section className="space-y-3 border-t pt-4" data-hd-font-library>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{t('Fonts')}</h3>
        <Button variant="outline" size="sm" disabled={checking} onClick={() => void check()}>
          {t(checking ? 'Checking fonts…' : 'Check local fonts')}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('Use a font preset or a custom font stack in text Properties.')}
      </p>
      <FontPresetSelect label="Preview font" value={stack} onChange={setStack} />
      <div className="rounded border border-border p-3" data-hd-font-preview>
        <p className="truncate text-xl" style={{ fontFamily: selected.stack }}>
          Aa Bb Cc · 0123456789
        </p>
        <p className="mt-1 text-sm" style={{ fontFamily: selected.stack }}>
          {t('Scientific slides · 科学演示')}
        </p>
        <p className="mt-3 text-xs" data-hd-font-status={status}>
          {t(STATUS_LABELS[status])}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground" role="status">
        {t(checking ? 'Checking local font availability…' : accessMessage)}
      </p>
      {selected.source && (
        <a
          href={selected.source}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs underline underline-offset-2"
        >
          {t('Font source and license')}
        </a>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t(
          'Install fonts through your operating system, then check again. Presets do not install or embed font files.',
        )}
      </p>
    </section>
  );
}
