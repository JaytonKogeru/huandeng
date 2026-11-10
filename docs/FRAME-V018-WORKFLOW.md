# v0.18 workflow implementation frame

This document fixes interfaces before implementation. Overall product decisions remain in SPEC-V018.

## Modules and ownership

| File | Responsibility |
| --- | --- |
| `packages/core/src/pptd/design-audit.ts` | Pure audit over a frozen DeckSnapshot and supplied image measurements; reusable by UI and Node. |
| `packages/core/src/pptd/design-audit-assets.ts` | Read bounded local image metadata from the selected Project and call the pure audit. |
| `packages/core/src/pptd/design-audit.test.ts` | Behavior tests for scale, roles, exceptions, section starts and no mutation. |
| `packages/core/src/pptd/design-audit-assets.test.ts` | Local path boundary, unsupported/oversize input and image size tests. |
| `packages/core/src/pptd/mcp.ts` | Read-only `huandeng_design_audit`, routed to the existing Project service. |
| `packages/core/src/pptd/cli.ts` | `quality [--language en|zh-CN] [--presentation ID]`. |
| `packages/core/src/vite/routes/pptd.ts` | Expose GET `/design-audit` alongside existing read routes. |
| `plugins/huandeng/skills/huandeng-story/references/production-design.md` | Concrete planning, bilingual typography, divider and rendered-review guidance. |
| `plugins/huandeng/skills/huandeng-story/references/asset-evidence.md` | Real screenshots, locale and resolution selection, public asset index. |

## Pure interface

```ts
interface DesignAuditOptions {
  language?: 'en' | 'zh-CN';
  requireSectionDividers?: boolean;
  expectedBackground?: string;
  maxTitleSize?: number;
  maxBodySize?: number;
}
interface ImageMeasurement {
  width: number;
  height: number;
  vector?: boolean;
}
function auditSlideDesign(
  snapshot: DeckSnapshot,
  options?: DesignAuditOptions,
  images?: Record<string, ImageMeasurement>,
): DesignAuditReport;
async function readSlideDesignAudit(
  root: string,
  snapshot: DeckSnapshot,
  options?: DesignAuditOptions,
): Promise<DesignAuditReport>;
```

`DesignAuditReport` includes schemaVersion, deckId, source revisions, language, page count, background distribution, per-page measurements, advisory findings, inspection limits and `visualInspectionRequired: true`. Findings carry stable page/element identities and measured values. All results concern the supplied snapshot; no approval state is written.

## Measurement decisions

- Normalize typography and geometry to a 960-unit-wide canvas so a 1920-wide deck is not flagged merely for using double-sized coordinates.
- Prefer declared `elementRoles` for title/body/caption and `designIntent.pageRole` for cover/section/content. Infer a title-only divider only from one nonempty visible text object and no content image/table/chart.
- Report large title/body type as advisory, including actual and normalized sizes; recognize cover and divider pages separately.
- Summarize resolved solid backgrounds. With expectedBackground requested, flag mismatches unless designIntent.backgroundException records an intention; never enforce color from prose.
- A Section start is organization. Report whether it actually begins with a title-only divider; warn about missing dividers only when requireSectionDividers is true. Do not create/delete pages from this audit.
- Compare visible source raster pixels after crop with display bounds at a 1920-pixel-wide presentation target. Mark sampling below 1x for recapture; 1–2x is usable with inspection. Exempt vectors from raster-resolution warnings.
- Treat missing, remote, unreadable and unsupported sources as unmeasured, not as high-resolution. Record the omission.
- Bound returned findings and metadata reads. Reject paths outside the Project and symlinks; no HTTP downloads or arbitrary file traversal.

## Project policy

Keep AGENTS.md as the only automatically discovered human authoring policy. Write audience, intended takeaway, page roles, approved references, type scale, background, margins and screenshot locale there. Do not invent a second competing style.json or silently parse arbitrary prose into enforced constraints.

Default guidance at 960×540: Chinese content titles 26–28 and body 17–18 regular; English titles 28–32 and body 18–20; captions 12–14. Covers/section titles have their own role and deliberate scale. These are starting ranges, not universal laws. Adjust against actual rendered content and the author's references. A short sentence in an oversized font still creates visual pressure.

## Process contract

Audit → Spec → Frame → Implement → Validate → Release. Frame consists of page roles/geometry plus small API or code scaffolds. It does not replace inspecting the content or rendered pages. Generate one representative content page and one section divider, validate them, then expand the deck with varied content-driven composition.

The product introduction must show the actual work: source folder, one Main Slides, reusable Presentation Slides, local Editor, scoped agent tools, a real change with before/after and useful history, playback and export. Keep implementation details in notes unless the intended audience needs them.

## Distribution

Extend the allowlisted builder with the new references and a content manifest. Doctor reports plugin version, Story skill hash, current runtime guide hash and presence of design-audit support. Native/account configurations remain distinct because their transports differ; shared guidance must have matching bytes. Do not edit installed caches directly or register duplicate MCP servers.
