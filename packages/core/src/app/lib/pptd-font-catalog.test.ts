import { describe, expect, it, vi } from 'vitest';
import {
  FONT_PRESETS,
  type FontPreset,
  fontAvailability,
  fontPresetForStack,
  readFontLibrary,
} from './pptd-font-catalog';

const preset = (family: string) =>
  FONT_PRESETS.find((item) => item.family === family) as FontPreset;

describe('font availability evidence', () => {
  it('distinguishes a listed family, a working local alias, a loaded web font and a missing family', async () => {
    const probe = vi.fn(async (family: string) => {
      if (family !== 'Source Sans 3') throw new Error('No local face');
    });
    const snapshot = await readFontLibrary({
      queryLocalFonts: async () => [{ family: 'ARIAL' }, { family: ' Arial ' }],
      loadedFamilies: () => ['Inter'],
      probeLocalFamily: probe,
    });
    expect(snapshot.access).toBe('granted');
    expect(fontAvailability(preset('Arial'), snapshot)).toBe('installed');
    expect(fontAvailability(preset('Source Sans 3'), snapshot)).toBe('installed');
    expect(fontAvailability(preset('Inter'), snapshot)).toBe('loaded');
    expect(fontAvailability(preset('Times New Roman'), snapshot)).toBe('missing');
    expect(probe).not.toHaveBeenCalledWith('Arial');
    expect(probe).not.toHaveBeenCalledWith('Inter');
    expect(probe).not.toHaveBeenCalledWith('sans-serif');
  });

  it('keeps unlisted fonts unverified after denied permission and never probes around that denial', async () => {
    const probe = vi.fn(async () => {});
    const snapshot = await readFontLibrary({
      queryLocalFonts: async () => {
        throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
      },
      loadedFamilies: () => ['Inter'],
      probeLocalFamily: probe,
    });
    expect(snapshot.access).toBe('denied');
    expect(fontAvailability(preset('Arial'), snapshot)).toBe('unverified');
    expect(fontAvailability(preset('Inter'), snapshot)).toBe('loaded');
    expect(probe).not.toHaveBeenCalled();
  });

  it('does not interpret unsupported local-font access as a missing font list', async () => {
    const probe = vi.fn(async () => {});
    const snapshot = await readFontLibrary({ probeLocalFamily: probe });
    expect(snapshot.access).toBe('unsupported');
    expect(fontAvailability(preset('Arial'), snapshot)).toBe('unverified');
    expect(fontAvailability(preset('system-ui'), snapshot)).toBe('generic');
    expect(probe).not.toHaveBeenCalled();
  });

  it('records a failed query without turning failures into installed or missing font claims', async () => {
    const snapshot = await readFontLibrary({
      queryLocalFonts: async () => {
        throw new Error('Font service failed');
      },
    });
    expect(snapshot.access).toBe('failed');
    expect(fontAvailability(preset('Arial'), snapshot)).toBe('unverified');
    expect(fontAvailability(preset('Arial'))).toBe('unverified');
  });

  it('recognizes preset spellings without absorbing a custom fallback order', () => {
    expect(fontPresetForStack("'Times New Roman', serif")?.family).toBe('Times New Roman');
    expect(fontPresetForStack('Arial')?.family).toBe('Arial');
    expect(fontPresetForStack('arial, SANS-SERIF')?.family).toBe('Arial');
    expect(fontPresetForStack('Arial, "Noto Sans", sans-serif')).toBeUndefined();
    expect(fontPresetForStack('"My font, with comma", serif')).toBeUndefined();
    expect(fontPresetForStack('')).toBeUndefined();
  });
});
