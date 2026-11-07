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
  path: string;
  state: 'active' | 'tombstone';
  designIntent?: { purpose?: string; keep?: string[]; [key: string]: unknown };
  elementRoles?: Record<string, string>;
  components?: Record<string, RecipeBinding>;
  lastAuthorReview?: unknown;
  [key: string]: unknown;
}

export interface ProjectMetadata {
  schemaVersion: 1;
  deckId: string;
  entry: string;
  slides: Record<string, SlideIdentity>;
  designPolicy?: string;
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
  kind: 'initial' | 'edit' | 'external' | 'restore';
  operationId?: string;
}

export interface PageVersionSnapshot {
  version: PageVersionSummary;
  page: PageSnapshot;
  size: PageSize;
  assets: 'current-project';
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

export interface PageAddOperation {
  op: 'page.add';
  page?: PptdPage;
  afterPageId?: string | null;
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
  | ElementPatchOperation
  | ElementAddOperation
  | ElementRemoveOperation
  | ElementReorderOperation
  | PageNotesOperation
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
