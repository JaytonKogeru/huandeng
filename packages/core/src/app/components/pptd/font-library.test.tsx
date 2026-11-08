import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FontLibrary, FontPresetSelect } from './font-library';

afterEach(() => vi.unstubAllGlobals());

describe('font library entry', () => {
  it('offers an explicit local check and never requests installed-font access while rendering', () => {
    const queryLocalFonts = vi.fn();
    vi.stubGlobal('window', { queryLocalFonts });
    const html = renderToStaticMarkup(<FontLibrary />);
    expect(queryLocalFonts).not.toHaveBeenCalled();
    expect(html).toContain('Check local fonts');
    expect(html).toContain('data-hd-font-status="unverified"');
    expect(html).toContain('Document fonts');
    expect(html).toContain('Open-source fonts');
    expect(html).toContain('Generic families');
    expect(html).toContain('Preview font');
  });

  it('retains a custom stack without changing it into the first preset', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <FontPresetSelect
        label="Font preset"
        value={'Arial, "My project font", sans-serif'}
        onChange={onChange}
      />,
    );
    expect(html).toContain('Custom font stack');
    expect(html).toContain('<option value="" selected="">');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the preset selector disabled for read-only text', () => {
    const html = renderToStaticMarkup(
      <FontPresetSelect label="Font preset" value="Arial" disabled onChange={() => {}} />,
    );
    expect(html.match(/<select\b[^>]*>/)?.[0]).toMatch(
      /data-hd-font-presets="true"[^>]*disabled=""/,
    );
    expect(html).toContain('<option value="Arial" selected="">Arial</option>');
  });
});
