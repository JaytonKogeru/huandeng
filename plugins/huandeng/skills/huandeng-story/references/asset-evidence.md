# Product screenshots and source assets

Use this when selecting UI captures, introducing software or preparing a public asset library.

## Purpose and locale

Each screenshot proves one action. Choose the audience's actual UI language; a translated caption around Chinese UI is not an English screenshot.

Capture the real running product with public/synthetic content. Preserve useful controls, selection and state. Do not generate, reconstruct or mock UI and call it a screenshot. Label conceptual architecture diagrams as such.

A desktop capture shrunk into a slide is often illegible. Crop to one task with enough context to understand it, then inspect at the final used size.

## Resolution

Keep originals and exact dimensions. Prefer at least twice the used size at delivery resolution: a 600×320 region in a 1920×1080 output benefits from at least 1200×640 source pixels after crop.

Use lossless PNG for text-heavy UI. Recapture tiny screenshots instead of upscaling. Vector art avoids raster sampling problems but still requires legible labels.

Design audit warns below one source pixel per output pixel at 1920-wide delivery. The capture target is two source pixels. Pixel count alone does not make a dense whole-window image readable.

## Asset index

For public product material, keep media/ASSETS.md with one row per delivered source/derivative:

| Field | Meaning |
| --- | --- |
| Path | Stable relative Project path |
| Kind | Real screenshot, original figure, concept diagram or logo |
| Locale / view | UI language and action/workspace |
| Source | Product version and public/synthetic source Project |
| Dimensions | Original width×height and crop |
| Use | Claim and approximate displayed size |
| Derivative | Parent original, crop bounds and authorized redaction |

Group by language and purpose, for example en/history-restore.png and zh/sections.png. Keep originals distinct from derivatives. Avoid scattered dated duplicates.

Public captures contain only releasable content. Use a clean product state or a disclosed crop/redaction for private paths, account details and unrelated tabs; preserve the true interface and behavior.

## In HUANDENG

Before authoring, check the actual client's required capabilities: Project binding, supplied-file access, image inspection, asset placement and export. If its native shell cannot copy a supplied binary, use the writer's asset import route to preload the exact authorized public asset into the explicitly selected Project, then have the agent use assets_list. Do not expand filesystem permissions, switch computers, invent a replacement image or claim that a failed copy succeeded.

Discover assets with pagination. Use original relative src/sourceName and preserve aspect ratio. Keep imported originals and earlier crops when they have participated in saved work. Ordinary operation-history before/after uses current Project asset bytes: deleting or replacing an old crop can erase the picture from that review even when the current slide uses a newer file. Add a new derivative with its own path instead of deleting or overwriting the old source. Main-unused status is not deletion permission: operation history, named versions or other Projects may still reference it. Asset cleanup is a separate explicit task that must account for those references.

Render the placed image at presentation size. If UI labels remain too small, crop closer or give the task another page. Decoration cannot restore missing detail.
