import { Magnet } from 'lucide-react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { Button } from '../ui/button';

export function SnappingToggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useHuandengLocale();
  return (
    <Button
      variant={enabled ? 'secondary' : 'ghost'}
      size="xs"
      aria-pressed={enabled}
      aria-label={t('智能辅助线')}
      title={enabled ? t('智能辅助线已开启 · 按住 Alt 暂停吸附') : t('智能辅助线已关闭')}
      data-hd-snapping-toggle
      disabled={disabled}
      onClick={() => onChange(!enabled)}
    >
      <Magnet className="size-3.5" />
      <span>{t('吸附')}</span>
    </Button>
  );
}
