import { fontFamilies, resolveFontStack } from './pptd-render-check';

export interface FontPreset {
  family: string;
  stack: string;
  source?: string;
}

const named = (family: string, fallback = 'sans-serif', source?: string): FontPreset => ({
  family,
  stack: `${JSON.stringify(family)}, ${fallback}`,
  ...(source ? { source } : {}),
});

export const FONT_PRESET_GROUPS: { label: string; fonts: FontPreset[] }[] = [
  {
    label: 'Document fonts',
    fonts: [
      named('Arial'),
      named('Arial Black'),
      named('Times New Roman', 'serif'),
      named('Calibri'),
      named('Cambria', 'serif'),
      named('Georgia', 'serif'),
      named('Verdana'),
      named('Tahoma'),
      named('Trebuchet MS'),
      named('Segoe UI'),
      named('Aptos'),
      named('Courier New', 'monospace'),
    ],
  },
  {
    label: 'Open-source fonts',
    fonts: [
      named('Source Sans 3', 'sans-serif', 'https://github.com/adobe-fonts/source-sans'),
      named('Source Serif 4', 'serif', 'https://github.com/adobe-fonts/source-serif'),
      named('Noto Sans', 'sans-serif', 'https://github.com/notofonts/latin-greek-cyrillic'),
      named('Noto Serif', 'serif', 'https://github.com/notofonts/latin-greek-cyrillic'),
      named('Noto Sans SC', 'sans-serif', 'https://github.com/notofonts/noto-cjk'),
      named('Noto Serif SC', 'serif', 'https://github.com/notofonts/noto-cjk'),
      named('Inter', 'sans-serif', 'https://github.com/rsms/inter'),
      named('Libre Baskerville', 'serif', 'https://github.com/impallari/Libre-Baskerville'),
      named('Libre Franklin', 'sans-serif', 'https://github.com/impallari/Libre-Franklin'),
    ],
  },
  {
    label: 'Generic families',
    fonts: ['system-ui', 'sans-serif', 'serif', 'monospace'].map((family) => ({
      family,
      stack: family,
    })),
  },
];

export const FONT_PRESETS = FONT_PRESET_GROUPS.flatMap((group) => group.fonts);

function familyKey(family: string): string {
  return family
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .toLocaleLowerCase();
}

export function fontPresetForStack(stack: string): FontPreset | undefined {
  const families = fontFamilies(stack).map(familyKey);
  return FONT_PRESETS.find((preset) => {
    const expected = fontFamilies(preset.stack).map(familyKey);
    return (
      families.join('\0') === expected.join('\0') ||
      (families.length === 1 && families[0] === familyKey(preset.family))
    );
  });
}

export interface FontLibrarySnapshot {
  access: 'granted' | 'denied' | 'unsupported' | 'failed';
  installedFamilies: string[];
  loadedFamilies: string[];
}

export interface FontLibrarySource {
  queryLocalFonts?: () => Promise<Array<{ family: string }>>;
  loadedFamilies?: () => string[];
  probeLocalFamily?: (family: string) => Promise<unknown>;
}

export async function readFontLibrary(source: FontLibrarySource): Promise<FontLibrarySnapshot> {
  let access: FontLibrarySnapshot['access'] = 'unsupported';
  const installed = new Set<string>();
  if (source.queryLocalFonts) {
    try {
      const fonts = await source.queryLocalFonts();
      for (const font of fonts) if (font.family?.trim()) installed.add(font.family.trim());
      access = 'granted';
    } catch (error) {
      access =
        error &&
        typeof error === 'object' &&
        'name' in error &&
        ['NotAllowedError', 'SecurityError'].includes(String(error.name))
          ? 'denied'
          : 'failed';
    }
  }
  const loaded = new Set(source.loadedFamilies?.() ?? []);
  const probe = source.probeLocalFamily;
  if (access === 'granted' && probe) {
    const known = new Set([...installed, ...loaded].map(familyKey));
    const aliases = FONT_PRESETS.filter(
      (preset) => preset.stack !== preset.family && !known.has(familyKey(preset.family)),
    );
    await Promise.all(
      aliases.map(async (preset) => {
        try {
          await probe(preset.family);
          installed.add(preset.family);
        } catch {
          // A failed local alias probe does not establish availability.
        }
      }),
    );
  }
  return {
    access,
    installedFamilies: [...installed].sort(),
    loadedFamilies: [...loaded].sort(),
  };
}

export function browserFontLibrarySource(): FontLibrarySource {
  const host = window as Window & {
    queryLocalFonts?: () => Promise<Array<{ family: string }>>;
  };
  return {
    queryLocalFonts: host.queryLocalFonts?.bind(host),
    loadedFamilies: () =>
      document.fonts
        ? [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family)
        : [],
    ...(typeof FontFace === 'function'
      ? {
          probeLocalFamily: (family: string) =>
            new FontFace('huandeng-font-library-check', `local(${JSON.stringify(family)})`).load(),
        }
      : {}),
  };
}

export type FontAvailability = 'installed' | 'loaded' | 'generic' | 'missing' | 'unverified';

export function fontAvailability(
  preset: FontPreset,
  snapshot?: FontLibrarySnapshot,
): FontAvailability {
  const available = new Set([
    ...(snapshot?.installedFamilies ?? []),
    ...(snapshot?.loadedFamilies ?? []),
  ]);
  const resolved = resolveFontStack(preset.stack, available, snapshot?.access === 'granted');
  if (resolved.status === 'generic') return 'generic';
  if (resolved.status === 'unverified') return 'unverified';
  if (resolved.status === 'fallback') return 'missing';
  return snapshot?.installedFamilies.some(
    (family) => familyKey(family) === familyKey(preset.family),
  )
    ? 'installed'
    : 'loaded';
}
