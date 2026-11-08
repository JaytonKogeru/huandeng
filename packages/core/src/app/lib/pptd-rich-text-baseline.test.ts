import { describe, expect, it } from 'vitest';
import {
  clearRichTextBaseline,
  clearUniformRichTextEmphasis,
  richTextBaseline,
} from './pptd-rich-text-baseline';

describe('rich text baseline formatting', () => {
  it('clears only uniform CSS emphasis baselines, preserving semantic tags and mixed local emphasis', () => {
    const source =
      '<p style="font-weight:normal"><span style="font-style:normal;text-decoration:none">Keep <strong>strong</strong> <em>italic</em> <u>underlined</u><br><sup>2</sup></span></p>';
    expect(clearUniformRichTextEmphasis(source)).toBe(
      '<p><span>Keep <strong>strong</strong> <em>italic</em> <u>underlined</u><br><sup>2</sup></span></p>',
    );
    const mixed =
      '<p style="font-weight:normal">Keep <span style="font-weight:bold;font-style:italic">local</span> emphasis</p>';
    expect(clearUniformRichTextEmphasis(mixed)).toBe(mixed);
    expect(
      clearUniformRichTextEmphasis(
        '<p style="font-weight:bold"><span style="font-weight:400">All normal</span></p>',
      ),
    ).toBe('<p><span>All normal</span></p>');
    expect(
      clearUniformRichTextEmphasis(
        '<p><span style="text-decoration:underline line-through">Keep strike</span></p>',
      ),
    ).toContain('text-decoration:underline line-through');
  });

  it('lets font presets clear only font-family while retaining all other inline styling and wording', () => {
    const source =
      '<p style="text-align:right"><span style="font-family:Arial;font-size:22px;color:#123456;font-weight:bold">A &amp; <em>B</em><br>C<sup>2</sup></span></p>';
    expect(clearRichTextBaseline(source, ['fontFamily'])).toBe(
      '<p style="text-align:right"><span style="font-size:22px;color:#123456;font-weight:bold">A &amp; <em>B</em><br>C<sup>2</sup></span></p>',
    );
    expect(
      clearRichTextBaseline(
        '<span style="font-family:&quot;Arial&quot;;font-size:22px">Title</span>',
        ['fontFamily'],
      ),
    ).toBe('<span style="font-size:22px">Title</span>');
  });

  it('retains local emphasis, links, literal entities and math while removing requested baseline CSS', () => {
    const source =
      '<p style="text-align:center;line-height:24px"><span style="font-size:18px;color:#fff;font-style:italic">A&nbsp;<strong>B</strong><sub>2</sub></span><a href="https://example.org/?q=a>1">source</a></p><math><mtext style="font-family:Symbol">x</mtext></math>';
    const result = clearRichTextBaseline(source, [
      'fontFamily',
      'fontSize',
      'color',
      'align',
      'lineHeightPx',
    ]);
    expect(result).toBe(
      '<p><span style="font-style:italic">A&nbsp;<strong>B</strong><sub>2</sub></span><a href="https://example.org/?q=a>1">source</a></p><math><mtext style="font-family:Symbol">x</mtext></math>',
    );
    expect(clearRichTextBaseline('Plain < 10\nUnchanged words', ['fontFamily'])).toBe(
      'Plain < 10\nUnchanged words',
    );
  });

  it('reads uniform CSS baselines with semantic emphasis without making one emphasized word the global style', () => {
    const content = {
      text: '<p style="text-align:center"><span style="font-family:&quot;Arial&quot;;font-size:34px;color:$ink;font-weight:bold">A <em>short</em> title<sup style="font-size:12px">2</sup></span></p>',
      fontSize: 18,
      fontFamily: 'MiSans',
      color: '#000000',
      align: ['left', 'top'],
      italic: false,
    };
    expect(richTextBaseline(content, { ink: '#202933' })).toMatchObject({
      fontFamily: '"Arial"',
      fontSize: 34,
      color: '#202933',
      bold: true,
      italic: false,
      align: ['center', 'top'],
    });
  });

  it('rejects ambiguous mixed baseline sizes and colors instead of guessing a heading run', () => {
    expect(() =>
      richTextBaseline({
        text: '<p><span style="font-size:34px">A</span><span style="font-size:20px">B</span></p>',
      }),
    ).toThrow('mixed inline fontSize');
    expect(() =>
      richTextBaseline({
        text: '<p><span style="color:#000000">A</span><span style="color:#ff0000">B</span></p>',
      }),
    ).toThrow('mixed inline color');
  });

  it('resolves imported pixel line height and inherited relative font sizes', () => {
    const result = richTextBaseline({
      text: '<p style="line-height:42px"><span style="font-size:150%;letter-spacing:0.5px">Title</span></p>',
      fontSize: 20,
      lineHeight: 1,
    });
    expect(result).toMatchObject({ fontSize: 30, lineHeightPx: 42, letterSpacing: 0.5 });
    expect(() =>
      richTextBaseline({ text: '<span style="font-size:calc(1px + 2em)">Title</span>' }),
    ).toThrow('unsupported inline font size');
  });
});
