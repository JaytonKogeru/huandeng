# Product screenshots and source assets

Use this when selecting UI captures, introducing software or preparing a public asset library.

## Purpose and locale

Choose each screenshot for an audience question and a visible action or state. Connect it to the work the speaker is explaining, rather than collecting every workspace as a feature catalogue. A screenshot can show an interface state; it does not establish the speaker's earlier experience or a universal claim about AI behavior. Choose the audience's actual UI language; a translated caption around Chinese UI is not an English screenshot.

Capture the real running product with public/synthetic content. Preserve useful controls, selection and state. Do not generate, reconstruct or mock UI and call it a screenshot. Label conceptual architecture diagrams as such.

Establish the actual whole interface before teaching a detail. A crop needs an understandable spatial link to its source region: retain the relevant navigation, or pair the full view and enlarged region with matched position markers or region outlines. Make the destination of a demonstrated action visible. Do not paste a tiny unreadable whole-window inset beside every crop as a substitute for orientation. Inspect the arrangement at presentation size; choose another composition or page when both place and detail cannot be read.

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
| Source | Original URL or file, product version and public/synthetic source Project |
| Acquisition | Author and independent capture/download, or explicitly authorized supplied source |
| Dimensions | Original width×height and crop |
| Use | Claim and approximate displayed size |
| Derivative | Parent original, crop bounds and authorized redaction |

Group by language and purpose, for example en/history-restore.png and zh/sections.png. Keep originals distinct from derivatives. Avoid scattered dated duplicates.

Public captures contain only releasable content. Use a clean product state or a disclosed crop/redaction for private paths, account details and unrelated tabs; preserve the true interface and behavior.

## In HUANDENG

Before authoring, check the actual client's required capabilities: Project binding, acquisition or supplied-file access, image inspection, asset placement and export. Verify a real result through advertised tools; configuration alone does not establish a working capture or download. A writer import can preserve an explicitly supplied original when a native binary copy is unavailable. For an independent author trial, the author must select, obtain and inspect its own active assets; coordinator preloads or another author's prepared media cannot stand in for that work. Independently acquired official sources may coincide. Do not expand filesystem permissions, switch computers, invent a replacement image or claim that a failed copy succeeded. Resolve or report a specific capability gap.

When advertised, `huandeng_asset_import` accepts the confirmed deckId, a source name and exactly one public HTTPS image URL or original base64 payload. It validates the actual image and imports it through the existing writer; it does not place an object. Public URLs must contain no credentials and cannot resolve or redirect to local/private/reserved addresses. Downloads have type, size and time limits. Preserve its returned source URL, dimensions, revision and relative path in the asset index. Original SVGs remain vectors; inspect their placed slide render.

`huandeng_editor_capture` captures the real complete web Editor for the bound Project. Choose an existing pageId, optional existing objectId, audience locale, and enumerated view/sidebar/inspector/viewport. It uses an isolated browser context, prevents all writes and selection broadcasts, and imports the resulting PNG through the existing writer. The current Main Project is the source; this is not a native Electron Agent setup capture, arbitrary web browser or scripted click interface. Management views may hide the Inspector as in the real Editor. Optional `dialog:"export"` opens the existing Export dialog without running an export; `historyVersionId` selects an existing named version of this page without restoring; `reviewOperationId` opens a real saved receipt affecting this page that is already present in this Project Activity. These three choices are mutually exclusive. Read actual IDs through the existing history/review tools; a missing Activity receipt or mismatched Project/page is an error, never a reconstructed Review. Capture waits for Files/Assets to finish loading before photographing them. Inspect the returned image and retain its capture state. This works with an existing compatible writer; do not start a second writer or replace a capture failure with a coordinator's screenshot.

### Crop a placed image without changing its original

The image object already supports a non-destructive instance crop through `element.patch`. Its top-level `crop.left`, `crop.top`, `crop.right` and `crop.bottom` are fractions of the original width/height removed from each edge, not pixels or 0–100 percentages. Use non-negative fractions below 1; each opposing pair must sum to less than 1. For a retained normalized rectangle `[x0,y0,x1,y1]`, set left=x0, top=y0, right=1-x1 and bottom=1-y1.

Preserve the selected region's aspect ratio: `width*(1-left-right) / (height*(1-top-bottom))`. Set matching display bounds and `fit.mode:"contain"`; `cover` may center-crop further, and `fill` distorts a mismatched rectangle. `src` remains the complete imported original. Another image instance can show that same source uncropped.

For a 3200×2000 original, retaining `[0.25,0.20,0.75,0.80]` leaves 1600×1200 pixels. After reading the actual page/image IDs and current page revision, place this operation in the usual transaction and run preview, apply, review and render:

```json
{"op":"element.patch","pageId":"PAGE_UUID","elementId":"IMAGE_ID","set":{"crop.left":0.25,"crop.top":0.20,"crop.right":0.25,"crop.bottom":0.20,"fit.mode":"contain","bounds":[96,96,480,360]}}
```

Replace the ID placeholders with real values; the example uses 480×360 page units to preserve the visible 4:3 region. Record the source and crop in the asset index. Keep a readable full-view locator, surrounding navigation or matched region evidence so the audience knows where the detail belongs. Change the composition when an old frame cannot show both location and detail. This does not add arbitrary capture actions. The existing Export dialog, named History preview and saved receipt Review have explicit read-only selectors; native Agent setup remains outside the capture interface.

### Preserve placed sources

Discover assets with pagination. Use original relative src/sourceName and preserve aspect ratio. Keep imported originals and earlier crops when they have participated in saved work. Ordinary operation-history before/after uses current Project asset bytes: deleting or replacing an old crop can erase the picture from that review even when the current slide uses a newer file. Add a new derivative with its own path instead of deleting or overwriting the old source. Main-unused status is not deletion permission: operation history, named versions or other Projects may still reference it. Asset cleanup is a separate explicit task that must account for those references.

Render the placed image at presentation size. If UI labels remain too small, enlarge the relevant region or give the task another page while preserving its location in the interface. Decoration cannot restore missing detail or explain where a detached crop came from.
