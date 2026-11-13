import type { PageSize, PageSnapshot, PptdElement } from './types';

export interface EditorialIssue {
  pageId: string;
  occurrenceId?: string;
  elementId?: string;
  ruleId: string;
  code: string;
  severity: 'warning' | 'info';
  message: string;
}

const textual = (element: PptdElement): string =>
  typeof element.content?.text === 'string'
    ? element.content.text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

function pageRole(page: PageSnapshot): string {
  return typeof page.metadata.designIntent?.pageRole === 'string'
    ? page.metadata.designIntent.pageRole
    : 'content';
}
function cardPattern(page: PageSnapshot, size: PageSize): string | null {
  if (pageRole(page) !== 'content') return null;
  const shapes = page.data.elements.filter(
    (element) =>
      element.elementType === 'shape' &&
      element.visible !== false &&
      element.bounds &&
      element.bounds[2] > size[0] * 0.16 &&
      element.bounds[3] > size[1] * 0.14 &&
      element.bounds[2] < size[0] * 0.45,
  );
  if (shapes.length !== 3) return null;
  const bounds = shapes.map((element) => element.bounds ?? [0, 0, 0, 0]);
  const widths = bounds.map((item) => item[2]);
  const heights = bounds.map((item) => item[3]);
  if (
    Math.max(...widths) - Math.min(...widths) > size[0] * 0.035 ||
    Math.max(...heights) - Math.min(...heights) > size[1] * 0.055 ||
    Math.max(...bounds.map((item) => item[1])) - Math.min(...bounds.map((item) => item[1])) >
      size[1] * 0.08
  )
    return null;
  return bounds
    .map((b) => Math.round((b[0] / size[0]) * 12) + ':' + Math.round((b[1] / size[1]) * 12))
    .sort()
    .join('|');
}

/** Cautious signals, never substitutes for actual rendered editorial judgment. */
export function auditEditorialPatterns(
  pages: readonly PageSnapshot[],
  size: PageSize,
): EditorialIssue[] {
  const result: EditorialIssue[] = [];
  const add = (
    page: PageSnapshot,
    ruleId: string,
    code: string,
    message: string,
    elementId?: string,
    severity: 'warning' | 'info' = 'warning',
  ) => {
    result.push({
      pageId: page.pageId,
      ...(page.occurrenceId ? { occurrenceId: page.occurrenceId } : {}),
      ...(elementId ? { elementId } : {}),
      ruleId,
      code,
      severity,
      message,
    });
  };

  for (const page of pages) {
    const elements = page.data.elements.filter(
      (element) => element.visible !== false && element.hidden !== true,
    );
    const texts = elements.filter((element) => element.elementType === 'text' && textual(element));
    const title = texts.find((element) =>
      /title|heading/.test(
        page.metadata.elementRoles?.[element.elementId] ??
          (typeof element.role === 'string' ? element.role : ''),
      ),
    );
    const contentTexts = texts.filter(
      (element) =>
        !/caption|label|footer|annotation|equation|formula/i.test(
          page.metadata.elementRoles?.[element.elementId] ??
            (typeof element.role === 'string' ? element.role : ''),
        ),
    );
    for (const element of texts) {
      const text = textual(element);
      const role = (
        page.metadata.elementRoles?.[element.elementId] ??
        (typeof element.role === 'string' ? element.role : '')
      ).toLowerCase();
      const nearFooter = Boolean(element.bounds && element.bounds[1] > size[1] * 0.81);
      if (
        /(?:仅供参考|不构成.{0,14}建议|仅供示意|免责声明|不能证明|不代表.{0,12}结论|for illustrative purposes only|not (?:a|an) (?:recommendation|endorsement)|disclaimer)/i.test(
          text,
        ) &&
        (/subtitle|footer|footnote|caption/.test(role) || nearFooter)
      )
        add(
          page,
          'VOICE-05',
          'EDITORIAL_DISCLAIMER_FURNITURE',
          'An irrelevant defensive disclaimer may be misplaced in a subtitle/footer; keep only qualifications that matter to the audience.',
          element.elementId,
        );
      if ((text.match(/[·•]/g) ?? []).length >= 2 && text.length < 180)
        add(
          page,
          'DOT-07',
          'EDITORIAL_MIDDOT_CHAIN',
          'Repeated middle-dot separators; consider natural language or semantic grouping.',
          element.elementId,
          'info',
        );
      if (
        (text.match(/→|➜|⇒|->/g) ?? []).length >= 2 &&
        !/equation|formula/i.test(role) &&
        text.length < 220
      )
        add(
          page,
          'ARROW-06',
          'EDITORIAL_TEXT_ARROW_CHAIN',
          'Text arrows imitate a diagram; consider real connectors with meaningful direction.',
          element.elementId,
          'info',
        );
      if (
        /(赋能未来|重塑未来|无限可能|引领创新|开启未来|unlocking (?:the )?future|empowering (?:the )?future|reimagining (?:the )?future)/i.test(
          text,
        ) &&
        (title?.elementId === element.elementId || text.length < 80)
      )
        add(
          page,
          'GENERIC-10',
          'EDITORIAL_GENERIC_SLOGAN',
          'A generic launch slogan appears; consider a concrete result, question or action.',
          element.elementId,
          'info',
        );
    }
    const total = contentTexts.reduce((sum, element) => sum + textual(element).length, 0);
    if (
      pageRole(page) === 'content' &&
      contentTexts.length >= 12 &&
      contentTexts.filter((item) => textual(item).length < 30).length >= 10
    )
      add(
        page,
        'FRAG-13',
        'EDITORIAL_FRAGMENTED_PROSE',
        'Numerous short text objects may be fragmented prose; legitimate figure and diagram labels are exempt.',
        undefined,
        'info',
      );
    if (
      pageRole(page) === 'content' &&
      total > 390 &&
      !elements.some((element) => ['image', 'chart', 'table'].includes(element.elementType))
    )
      add(
        page,
        'TEXT-12',
        'EDITORIAL_TEXT_WITHOUT_EVIDENCE',
        'A text-heavy content page lacks visual evidence; inspect whether a relevant asset or diagram would teach better.',
        undefined,
        'info',
      );
  }

  let start = 0;
  while (start < pages.length) {
    const fingerprint = cardPattern(pages[start], size);
    if (!fingerprint) {
      start++;
      continue;
    }
    let end = start + 1;
    while (end < pages.length && cardPattern(pages[end], size) === fingerprint) end++;
    if (end - start >= 3) {
      for (let index = start; index < end; index++)
        add(
          pages[index],
          'CARDS-08',
          'EDITORIAL_REPEATED_EQUAL_CARDS',
          String(end - start) +
            ' consecutive pages repeat an identical three-card layout; review whether the content warrants it.',
          undefined,
          'warning',
        );
    }
    start = end;
  }
  return result;
}
