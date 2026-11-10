# Zero-dimension line rendering

## Audit

PPTD accepts horizontal lines with zero height and vertical lines with zero width. The renderer gives their SVG a `100%` viewport, which collapses that axis to zero and suppresses both the stroke and its arrowheads. A nonzero SVG `viewBox` and visible overflow do not restore a zero-sized viewport.

## Contract

- Preserve authored bounds, endpoint order, rotation, flips, and animation transforms. Negative direction is represented by endpoint order or flips, not negative frame dimensions.
- Project line points and curve control points from their viewBox into the actual local frame. A zero frame axis projects every coordinate on that axis to zero.
- Give only the inner SVG a nonzero viewport; leave the outer frame and its rotation center unchanged.
- Render markers in local slide units so their size follows stroke width, independent of aspect ratio.
- Keep native PPTX geometry unchanged: zero frame dimensions are valid, path coordinate extents use the existing minimum of one EMU, and arrow endpoints retain authored order.

## Acceptance

Chromium pixel checks cover horizontal and vertical lines in both directions, arrowhead visibility, flips, rotation, and ordinary diagonal lines. Native PPTX regression checks confirm editable zero-dimension paths and arrow endpoints without raster fallback or source mutation. Existing renderer and technical-diagnostics tests remain green.

## Verification

- Before the fix: six zero-dimension Chromium cases failed; the ordinary diagonal control passed.
- After the fix: nine Chromium cases pass, including a start arrow with a non-unit viewBox and a collapsed quadratic curve.
- Forty-five focused unit tests pass across native PPTX export, line export, technical diagnostics, and the existing animation, position-field, text-format, and image-priority renderer suites.
- Core TypeScript checking, focused Biome checking, and `git diff --check` pass.
- PPTX verification inspects native OOXML geometry and export reports; it does not constitute a new PowerPoint application rendering test. No application restart, live deck mutation, commit, or publication was performed.
