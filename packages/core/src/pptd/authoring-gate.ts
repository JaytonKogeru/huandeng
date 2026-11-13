import type { DesignAuditReport } from './design-audit';

export type AuthoringGateStage = 'prototype' | 'release';
export interface EditorialReviewEvidence {
  pageId: string;
  renderRevision: string;
  inspected: boolean;
  observation: string;
}
export interface EditorialException {
  pageId: string;
  code: string;
  reason: string;
}

export interface AuthoringGateInput {
  stage: AuthoringGateStage;
  reviews?: EditorialReviewEvidence[];
  exceptions?: EditorialException[];
}
export interface AuthoringGateResult {
  status: 'blocked' | 'needs-review' | 'ready-for-author';
  stage: AuthoringGateStage;
  editorialStandard: DesignAuditReport['editorialStandard'];
  reviewedCount: number;
  requiredCount: number;
  staleOrUnreviewedPages: string[];
  unresolvedWarnings: DesignAuditReport['findings'];
  advisorySignals: number;
  selfReportedVisualReview: true;
  authorAcceptance: false;
  message: string;
}

/**
 * Fail closed on missing/stale per-page visual review receipts. A model's
 * declaration is evidence of its CLAIM, not proof that it actually saw pixels.
 */
export function assessAuthoringGate(
  report: DesignAuditReport,
  input: AuthoringGateInput,
): AuthoringGateResult {
  if (!['prototype', 'release'].includes(input.stage))
    throw new Error('Unknown editorial gate stage.');
  const pages = report.pages;
  const byId = new Map(pages.map((page) => [page.pageId, page]));
  const fresh = new Set<string>();
  for (const review of input.reviews ?? []) {
    const page = byId.get(review.pageId);
    if (
      page &&
      review.inspected === true &&
      review.renderRevision === page.renderRevision &&
      typeof review.observation === 'string' &&
      review.observation.trim().length >= 18
    )
      fresh.add(review.pageId);
  }
  const requiredCount = input.stage === 'prototype' ? 2 : pages.length;
  const staleOrUnreviewedPages =
    input.stage === 'prototype' && fresh.size >= requiredCount
      ? []
      : pages.filter((page) => !fresh.has(page.pageId)).map((page) => page.pageId);
  const reviewableCodes = new Set([
    'EDITORIAL_REPEATED_EQUAL_CARDS',
    'EDITORIAL_DISCLAIMER_FURNITURE',
    'DESIGN_LOW_RESOLUTION',
    'DESIGN_SECTION_DIVIDER_MISSING',
  ]);
  const exceptionKeys = new Set(
    (input.exceptions ?? [])
      .filter(
        (item) =>
          typeof item?.reason === 'string' &&
          item.reason.trim().length >= 20 &&
          byId.has(item.pageId),
      )
      .map((item) => item.pageId + ':' + item.code),
  );
  const unresolvedWarnings = report.findings.filter(
    (item) =>
      item.severity === 'warning' &&
      reviewableCodes.has(item.code) &&
      !exceptionKeys.has(item.pageId + ':' + item.code),
  );
  const evidenceComplete = fresh.size >= requiredCount && staleOrUnreviewedPages.length === 0;
  const blocked =
    unresolvedWarnings.length > 0 ||
    report.truncated ||
    pages.length === 0 ||
    pages.length < requiredCount;
  const status: AuthoringGateResult['status'] = blocked
    ? 'blocked'
    : evidenceComplete
      ? 'ready-for-author'
      : 'needs-review';
  return {
    status,
    stage: input.stage,
    editorialStandard: report.editorialStandard,
    reviewedCount: fresh.size,
    requiredCount,
    staleOrUnreviewedPages,
    unresolvedWarnings,
    advisorySignals: report.editorialStandard.automatedSignals,
    selfReportedVisualReview: true,
    authorAcceptance: false,
    message:
      status === 'ready-for-author'
        ? 'Automated checks and self-reported visual review prerequisites are complete. Author acceptance and actual image inspection remain separate.'
        : blocked
          ? 'Resolve the referenced defects, missing prototype pages or truncated audit; document any authorized exceptions, then rerun.'
          : 'Render and personally inspect the required pages at current render revisions; submit specific observations.',
  };
}
