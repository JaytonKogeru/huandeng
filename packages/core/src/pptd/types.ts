import type { PageAnimation } from './animation-model';
import type { PageTransition } from './page-transition';

export type Revision = `sha256:${string}`;
export type PageSize = [number, number];
export type Bounds = [number, number, number, number];

export interface PptdElement {
  elementId: string;
  elementType: string;
  bounds?: Bounds;
  content?: Record<string, unknown>;
  rotation?: number;
  [key: string]: unknown;
}

export interface PptdPage {
  elements: PptdElement[];
  notes?: string;
  [key: string]: unknown;
}

export interface PptdManifest {
  pages: string[];
  size?: PageSize;
  title?: string;
  [key: string]: unknown;
}

export interface RecipeBinding {
  recipe: string;
  recipeVersion: number;
  params: Record<string, unknown>;
  slots: Record<string, string | null>;
  overrides: Record<string, string[]>;
  [key: string]: unknown;
}

export interface SlideIdentity {
  shortCode: string | null;
  hidden?: boolean;
  label?: string;
  path: string;
  state: 'active' | 'tombstone';
  designIntent?: { purpose?: string; keep?: string[]; [key: string]: unknown };
  elementRoles?: Record<string, string>;
  components?: Record<string, RecipeBinding>;
  lastAuthorReview?: unknown;
  themeOverride?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProjectMetadata {
  schemaVersion: 1;
  deckId: string;
  entry: string;
  slides: Record<string, SlideIdentity>;
  designPolicy?: string;
  project?: ProjectModel;
  [key: string]: unknown;
}

export interface Diagnostic {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  pageId?: string;
  elementId?: string;
  path?: string;
}

export interface ElementRef {
  pageId: string;
  elementId: string;
}

export interface AuthorReviewContext {
  status: 'current' | 'stale' | 'unverified';
  recordedRenderRevision: Revision | null;
  currentRenderRevision: Revision;
  approvalVerified: false;
}

export interface PageSnapshot {
  pageId: string;
  /** A presentation can refer to one stable page more than once. */
  occurrenceId?: string;
  versionId?: string;
  presentationNotes?: string;
  shortCode: string | null;
  path: string;
  state: 'active' | 'tombstone';
  pageRevision: Revision;
  renderRevision: Revision;
  assetRevisions?: Record<string, Revision | null>;
  authorReview?: AuthorReviewContext;
  data: PptdPage;
  metadata: SlideIdentity;
}

export interface PageVersionSummary {
  versionId: string;
  pageId: string;
  createdAt: string;
  actor: string;
  summary: string;
  pageRevision: Revision;
  current: boolean;
  kind: 'initial' | 'edit' | 'external' | 'restore' | 'checkpoint';
  operationId?: string;
}

export interface PageVersionSnapshot {
  version: PageVersionSummary;
  page: PageSnapshot;
  size: PageSize;
  assets: 'current-project' | 'archived';
  theme?: Record<string, unknown>;
}

export interface CreatePageCheckpointRequest {
  pageId: string;
  requestId: string;
  label: string;
  expectedPageRevision: Revision | string;
  expectedMetadataRevision: Revision | string | null;
  actor?: string;
}

export interface RestorePageVersionRequest {
  pageId: string;
  versionId: string;
  requestId: string;
  expectedPageRevision: Revision | string;
  expectedMetadataRevision?: Revision | string | null;
  actor?: string;
  originClientId?: string;
}

export interface DeckSnapshot {
  kind: 'pptd';
  presentationId?: string;
  deckId: string;
  entry: string;
  title: string;
  size: PageSize;
  manifest: PptdManifest;
  manifestRevision: Revision;
  metadataRevision: Revision | null;
  pages: PageSnapshot[];
  metadata: ProjectMetadata;
  identityPersisted: boolean;
  writable: boolean;
  epoch: string;
  sequence: number;
  diagnostics: Diagnostic[];
}

export interface ExpectedRevisions {
  pages?: Record<string, Revision | string>;
  manifest?: Revision | string;
  metadata?: Revision | string | null;
}

export interface ElementPatchOperation extends ElementRef {
  op: 'element.patch';
  set: Record<string, unknown>;
  unset?: string[];
}

export interface ElementAddOperation {
  op: 'element.add';
  pageId: string;
  element: PptdElement;
  afterElementId?: string | null;
}

export interface ElementRemoveOperation extends ElementRef {
  op: 'element.remove';
}

export interface ElementReorderOperation {
  op: 'element.reorder';
  pageId: string;
  elementIds: string[];
}

export interface PageNotesOperation {
  op: 'page.notes.set';
  pageId: string;
  text: string;
}

export interface PageTimelineOperation {
  op: 'page.timeline.set';
  pageId: string;
  timeline: PageAnimation | null;
}

export interface PageTransitionOperation {
  op: 'page.transition.set';
  pageId: string;
  transition: PageTransition | null;
}

export interface PageAddOperation {
  op: 'page.add';
  page?: PptdPage;
  afterPageId?: string | null;
  section?: { id: string; title: string; frontMatter?: boolean };
}

export interface PageDuplicateOperation {
  op: 'page.duplicate';
  pageId: string;
  afterPageId?: string | null;
}

export interface PageMoveOperation {
  op: 'page.move';
  pageId: string;
  afterPageId?: string | null;
}

export interface PageRemoveOperation {
  op: 'page.remove';
  pageId: string;
}

export interface PageRestoreOperation {
  op: 'page.restore';
  pageId: string;
  afterPageId?: string | null;
}

export interface PageRelinkOperation {
  op: 'page.relink';
  pageId: string;
  path: string;
}

export interface MetadataPatchOperation {
  op: 'metadata.patch';
  pageId: string;
  set: Record<string, unknown>;
  unset?: string[];
}

export interface HistoryRevertOperation {
  op: 'history.revert';
  operationId: string;
}

export interface PageVersionRestoreOperation {
  op: 'page.version.restore';
  pageId: string;
  versionId: string;
}

export interface RecipeApplyOperation {
  op: 'recipe.apply';
  pageId: string;
  instanceId: string;
  params?: Record<string, unknown>;
}

export interface RecipeResetOperation {
  op: 'recipe.reset';
  pageId: string;
  instanceId: string;
  params?: Record<string, unknown>;
  reset?: {
    slots?: string[];
    groups?: ('geometry' | 'crop' | 'font' | 'appearance' | 'content' | 'asset')[];
  };
}

export type PptdOperation =
  | ProjectReplaceOperation
  | ElementPatchOperation
  | ElementAddOperation
  | ElementRemoveOperation
  | ElementReorderOperation
  | PageNotesOperation
  | PageTimelineOperation
  | PageTransitionOperation
  | PageAddOperation
  | PageDuplicateOperation
  | PageMoveOperation
  | PageRemoveOperation
  | PageRestoreOperation
  | PageRelinkOperation
  | MetadataPatchOperation
  | RecipeApplyOperation
  | RecipeResetOperation
  | PageVersionRestoreOperation
  | HistoryRevertOperation;

export interface TransactionRequest {
  requestId: string;
  deckId: string;
  actor: string;
  originClientId?: string;
  expected: ExpectedRevisions;
  operations: PptdOperation[];
}

export interface NewRevisions {
  pages: Record<string, Revision>;
  manifest: Revision;
  metadata: Revision | null;
}

export interface CreatedPage {
  pageId: string;
  shortCode: string;
  path: string;
}

export interface TransactionResult {
  ok: true;
  requestId: string;
  operationId: string;
  newRevisions: NewRevisions;
  changedPages: string[];
  changedElements: ElementRef[];
  createdPages: CreatedPage[];
  skippedOverrides: ElementRef[];
  diagnostics: Diagnostic[];
  noOp: boolean;
}

export interface ProposalValue {
  present: boolean;
  value?: unknown;
  truncated?: boolean;
  characters?: number;
}

export interface ProposalChange {
  target: 'manifest' | 'project' | 'metadata' | 'page' | 'element';
  pageId?: string;
  elementId?: string;
  field: string;
  before: ProposalValue;
  after: ProposalValue;
}

export interface ProposalPageImpact {
  pageId: string;
  label: string;
  provisional: boolean;
  beforeRevision: Revision | null;
  afterRevision: Revision | null;
  usedBy: {
    presentationId: string | null;
    presentationTitle: string;
    occurrenceId: string;
    position: number;
    versionId?: string;
  }[];
  totalUses: number;
  usesTruncated: boolean;
}

export interface TransactionPreview {
  ok: true;
  kind: 'proposal-preview';
  schemaVersion: 1;
  deckId: string;
  requestId: string;
  previewHash: Revision;
  writable: boolean;
  baseline: NewRevisions;
  operations: { op: string; count: number }[];
  files: {
    role: 'page' | 'manifest' | 'metadata';
    path: string;
    pageId?: string;
    provisional: boolean;
    beforeRevision: Revision | null;
    afterRevision: Revision | null;
  }[];
  totalFileCount: number;
  filesTruncated: boolean;
  pages: ProposalPageImpact[];
  totalPageCount: number;
  pagesTruncated: boolean;
  changes: ProposalChange[];
  totalChangeCount: number;
  changesTruncated: boolean;
  createdPageCount: number;
  skippedOverrides: ElementRef[];
  totalSkippedOverrides: number;
  noOp: boolean;
  diagnostics: Diagnostic[];
  diagnosticsTruncated: boolean;
}

export interface DocumentEvent {
  type: 'committed' | 'external' | 'diagnostic';
  epoch: string;
  sequence: number;
  operationId?: string;
  originClientId?: string;
  changedPages: Record<
    string,
    {
      before: Revision | null;
      after: Revision | null;
      beforeRenderRevision?: Revision | null;
      afterRenderRevision?: Revision | null;
    }
  >;
  manifestChanged: boolean;
  metadataChanged: boolean;
  diagnostics: Diagnostic[];
}

export interface HistorySummary {
  operationId: string;
  requestId: string;
  actor: string;
  timestamp: string;
  summary: string;
  changedPages: string[];
  changedElements: ElementRef[];
  revertedOperationId?: string;
  before: NewRevisions;
  after: NewRevisions;
}

export type PptdErrorCode =
  | 'REVISION_CONFLICT'
  | 'MISSING_PRECONDITION'
  | 'TARGET_NOT_FOUND'
  | 'AMBIGUOUS_ID'
  | 'INVALID_DOCUMENT'
  | 'INVALID_REQUEST'
  | 'UNSUPPORTED_SOURCE_EDIT'
  | 'REQUEST_ID_REUSE'
  | 'SAVE_FAILED'
  | 'PENDING_RECOVERY'
  | 'RECOVERY_REQUIRED'
  | 'HISTORY_UNAVAILABLE'
  | 'UNDO_CONFLICT'
  | 'READ_ONLY'
  | 'WRITER_LOCKED'
  | 'PATH_OUTSIDE_PROJECT';

export class PptdError extends Error {
  readonly code: PptdErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: PptdErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'PptdError';
    this.code = code;
    this.details = details;
  }
}

import type { ProjectModel, ProjectReplaceOperation } from './project-model';
