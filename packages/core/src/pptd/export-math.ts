import katex from 'katex';
import { colorXml } from '../app/lib/pptx/ooxml';
import type { RunStyle } from '../app/lib/pptx/scene';
import { ExportFeatureError } from './export-images';
import { mathmlToOmml } from './vendor/open-pptd/mathml2omml.js';

export const MATH_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
export const A14_NAMESPACE = 'http://schemas.microsoft.com/office/drawing/2010/main';
const COMPATIBILITY_NAMESPACE = 'http://schemas.openxmlformats.org/markup-compatibility/2006';
const MATH_FONT = '<a:latin typeface="Cambria Math"/><a:ea typeface="Cambria Math"/>';

export function formulaRunXml(
  source: string,
  display: boolean,
  style: RunStyle,
  align: 'l' | 'ctr' | 'r' | 'just' = 'l',
): string {
  let omml: string;
  try {
    const mathml = katex.renderToString(source, {
      output: 'mathml',
      displayMode: display,
      throwOnError: true,
      trust: false,
      maxExpand: 1000,
      maxSize: 100,
    });
    omml = mathmlToOmml(mathml);
    if (!omml.startsWith('<m:oMath>') || !omml.endsWith('</m:oMath>'))
      throw new Error('The formula converter returned an invalid root.');
  } catch (error) {
    throw new ExportFeatureError(
      'INVALID_FORMULA',
      `Formula cannot be exported: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const size = Math.max(100, Math.round(style.sizePx * 50));
  const properties = `<a:rPr sz="${size}"><a:solidFill>${colorXml(style.color)}</a:solidFill>${MATH_FONT}</a:rPr>`;
  omml = omml.replace(
    /<m:r>(<m:rPr>[\s\S]*?<\/m:rPr>)?(?=<m:t>([^<]*)<\/m:t>)/g,
    (_match, runProperties: string | undefined, text: string) => {
      const italic = runProperties?.includes('<m:nor/>')
        ? ' i="0"'
        : !runProperties && /^[A-Za-z]+$/.test(text)
          ? ' i="1"'
          : '';
      return `<m:r>${runProperties ?? ''}${properties.replace('<a:rPr', `<a:rPr${italic}`)}`;
    },
  );
  const control = `<m:ctrlPr>${properties}</m:ctrlPr>`;
  for (const name of [
    'f',
    'sSub',
    'sSup',
    'sSubSup',
    'limLow',
    'limUpp',
    'nary',
    'd',
    'rad',
    'bar',
    'acc',
    'groupChr',
    'borderBox',
    'eqArr',
    'm',
  ]) {
    const property = `m:${name}Pr`;
    omml = omml.replace(
      new RegExp(`<m:${name}>(?:<${property}(?:\\/>|>([\\s\\S]*?)<\\/${property}>))?`, 'g'),
      (_match, children: string | undefined) =>
        `<m:${name}><${property}>${children ?? ''}${control}</${property}>`,
    );
  }
  omml = omml
    .replace('<m:oMath>', `<m:oMath xmlns:m="${MATH_NAMESPACE}">`)
    // KaTeX's \bar uses U+02C9; Office accents require the combining overline (U+0305).
    .replace(/<m:chr m:val="\u02c9"\/>/g, '<m:chr m:val="\u0305"/>')
    .replace(/<m:grow m:val="1"\/>/g, '<m:grow m:val="on"/>')
    .replace(/<m:grow m:val="0"\/>/g, '<m:grow m:val="off"/>');
  const alignment = align === 'ctr' ? 'center' : align === 'r' ? 'right' : 'left';
  const content = display
    ? `<m:oMathPara xmlns:m="${MATH_NAMESPACE}"><m:oMathParaPr><m:jc m:val="${alignment}"/></m:oMathParaPr>${omml}</m:oMathPara>`
    : omml;
  return `<a14:m xmlns:a14="${A14_NAMESPACE}">${content}</a14:m>`;
}

export function mathCompatibilityXml(native: string, fallback: string): string {
  return `<mc:AlternateContent xmlns:mc="${COMPATIBILITY_NAMESPACE}"><mc:Choice xmlns:a14="${A14_NAMESPACE}" Requires="a14">${native}</mc:Choice><mc:Fallback>${fallback}</mc:Fallback></mc:AlternateContent>`;
}
