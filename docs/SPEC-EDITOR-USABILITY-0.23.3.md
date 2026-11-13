# HUANDENG 0.23.3 — Page navigation, Bézier lines, rich clipboard

Date: 2026-11-13.

## Scope and audited failures

The user reported three Editor usability gaps:
1. Deleting the selected Main Slide returns the view to the first slide. The route derived selectedView from URL page identity and otherwise defaulted to `viewPages[0]`, with no neighbor selected on `page.remove`.
2. The line toolbar only creates two-point straight lines, while the existing renderer supports three-point quadratic and four-point cubic Bézier geometry. Neither insertion nor inspector exposed curved lines; native PowerPoint output accepted two endpoints only.
3. Ctrl+C for objects put the internal `huandeng-elements` JSON in `text/plain`, which external apps would paste as code; timing/focus handling sometimes made pasting unreliable. The user requested externally pasteable PNG and separate JSON commands, while preserving editable in-project object copying and tolerating RustDesk clipboard transfers.

## Accepted behavior

### Page deletion
- After a successful `page.remove` of the selected Main Slide, navigate to the previous existing Slide.
- If the first Slide is removed, select the new first Slide; if all Pages are gone, clear the requested identity.
- Removing a nonselected page must leave selection unchanged. Never select a new page before the mutation succeeds.

### Curved lines
- Add a Curve tool next to the straight Line tool; dragging creates editable quadratic Bézier path data without inventing another element type.
- In the Inspector, an existing line can switch between Straight and Curve; Bend (%) adjusts its quadratic control point with signed bend from -100 to 100.
- Preserve arrows, theme colors, stroke, geometry and reversibility. Keep original straight-line behavior intact.
- Native PPTX export emits `a:quadBezTo` or `a:cubicBezTo` so the line remains an editable Office path, not a raster fallback.

### Clipboard
- Ctrl+C on selected objects writes a single clipboard entry with both **standard `image/png`** and a namespaced HUANDENG **`web application/vnd.huandeng.elements+json`** payload. No plain JSON is exposed to third-party text destinations.
- Ctrl+Alt+C explicitly copies only the structured JSON text, avoiding Chromium's Ctrl+Shift+C DevTools shortcut.
- Pasting within the same Project recreates editable elements through the original shared writer; when a different Project or a non-HUANDENG app is the receiver, PNG is the interop path. Do not reuse media paths from a different Project.
- A pending copy is awaited by an immediate paste. Copy/cut failures must be surfaced; cut must not remove objects until clipboard write succeeds.
- Capture *rendered* objects, including fit/crop/rotation and multiple selection; capture pixels must be checked in a headless browser, not inferred from blob size.
- Main-process Electron clipboard operations are scoped to an authorized Project WebContents and accept only allowlisted image and object MIME payloads, with bounded sizes. No clipboard tests may write the operator's actual clipboard on the live computer.
- No new proxy/tunnel is involved.

### Boundaries
- Do not alter user slides, existing user presets or independently modified examples.
- No in-place changes to the running Editor; deliver an isolated official package built from a clean annotated source tag.
- Keep existing agent protocol, concurrent writer behavior and immutable review features.

## Validation gates
- Focused unit tests for selected-page fallback, straight/curved insertion, keyboard ownership, curve endpoints, native editable OOXML export.
- Native clipboard contract tests for atomic dual MIME, JSON-only, third-party image, size rejection; Chromium capture tests inspect transparent margins and nonblank shape and imported image pixels.
- Complete unit, typecheck, source check and native contracts; independent Windows CI to build and validate official ZIP, startup and install/removal.
- GitHub tag source and compiled artifact identities, archive hashes, public Release once all CI gates pass.
