import { useEffect, useMemo, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { loadScientificIcon, type ScientificIcon } from '../../../pptd/icon-registry';
import type { PptdElement } from '../../../pptd/types';
import { BoundedSvgCache } from '../../lib/bounded-svg-cache';

type Theme = { colors?: Record<string, string>; chartColors?: string[] };

const chartCache = new BoundedSvgCache();

function ObjectError({ message }: { message: string }) {
  useHuandengLocale();
  return (
    <div
      data-hd-unsupported="true"
      data-pptd-unsupported="true"
      className="flex h-full w-full items-center justify-center overflow-hidden border border-dashed border-amber-500 bg-amber-50 p-2 text-xs text-amber-900"
    >
      {t(message)}
    </div>
  );
}

export function ChartContent({ element, theme }: { element: PptdElement; theme: Theme }) {
  useHuandengLocale();
  const key = useMemo(
    () =>
      JSON.stringify({
        element: {
          ...element,
          elementId: '',
          bounds: [0, 0, element.bounds?.[2] ?? 600, element.bounds?.[3] ?? 320],
          rotation: 0,
          opacity: 1,
          flip: undefined,
          shadow: undefined,
        },
        theme: { colors: theme.colors, chartColors: theme.chartColors },
      }),
    [element, theme],
  );
  const definition = useMemo(
    () => JSON.parse(key) as { element: PptdElement; theme: Theme },
    [key],
  );
  const [result, setResult] = useState<{ key: string; svg?: string; error?: string } | null>(null);
  const cached = chartCache.get(key);
  useEffect(() => {
    if (chartCache.has(key)) return;
    let active = true;
    void import('../../../pptd/chart-engine')
      .then(({ renderChartSvg }) => {
        const svg = renderChartSvg(definition.element, definition.theme);
        chartCache.set(key, svg);
        if (active) setResult({ key, svg });
      })
      .catch((error: unknown) => {
        if (active)
          setResult({ key, error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      active = false;
    };
  }, [key, definition]);
  const current = result?.key === key ? result : null;
  if (current?.error) return <ObjectError message={current.error} />;
  const svg = cached ?? current?.svg;
  if (!svg)
    return (
      <div
        data-hd-loading="chart"
        className="flex h-full w-full items-center justify-center text-xs text-muted-foreground"
      >
        {t('正在绘制图表…')}
      </div>
    );
  return (
    <div
      data-hd-chart
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: The bundled ECharts renderer escapes data and generates SVG from an allowlisted chart adapter.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function IconSvg({
  icon,
  color = 'currentColor',
}: {
  icon: ScientificIcon;
  color?: string;
}) {
  useHuandengLocale();
  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="100%"
      viewBox={`0 0 ${icon.width} ${icon.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {icon.paths.map((path) => (
        <path key={path} fill={color} d={path} />
      ))}
    </svg>
  );
}

export function IconContent({ element, theme }: { element: PptdElement; theme: Theme }) {
  useHuandengLocale();
  const name = String(element.iconName ?? 'fas:circle-check');
  const [result, setResult] = useState<{
    name: string;
    icon?: ScientificIcon;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    void loadScientificIcon(name)
      .then((icon) => {
        if (active) setResult({ name, icon });
      })
      .catch((error: unknown) => {
        if (active)
          setResult({ name, error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      active = false;
    };
  }, [name]);
  const current = result?.name === name ? result : null;
  if (current?.error) return <ObjectError message={current.error} />;
  if (!current?.icon) return <div data-hd-loading="icon" />;
  const fill =
    element.fill && typeof element.fill === 'object'
      ? (element.fill as Record<string, unknown>)
      : {};
  const color =
    typeof element.fill === 'string'
      ? element.fill
      : String(fill.color ?? element.color ?? '#263531');
  return (
    <div data-hd-icon={name} style={{ width: '100%', height: '100%' }}>
      <IconSvg
        icon={current.icon}
        color={color.startsWith('$') ? (theme.colors?.[color.slice(1)] ?? '#263531') : color}
      />
    </div>
  );
}
