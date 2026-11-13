# HUANDENG Editor 0.23.3 — Editor usability upgrade

Released 2026-11-13. Previous: [0.23.2](RELEASE-V0232.md). See [specification](SPEC-EDITOR-USABILITY-0.23.3.md).

Three requests from actual Editor usage are addressed:

**Deleting a Slide keeps your place.** After removing the currently selected Main Slide, the Editor selects the previous Slide. Removing the first selects its successor. Deleting a different Slide does not force a navigation jump.

**Editable curves.** A Curve tool is available beside the straight Line tool. Drag to create a quadratic Bézier line; select it and use Inspector > Line shape and Bend (%) to switch between straight and curved or adjust curvature. Arrow endpoints and stroke settings remain editable. PPTX output uses native PowerPoint quadratic/cubic path geometry, rather than exporting a bitmap.

**Copying images works outside HUANDENG.** Ctrl+C writes a standard PNG of the selected object(s), together with hidden HUANDENG object data in one clipboard entry. Pasting within the same Project keeps the original editable objects. Pasting into PowerPoint, Word, an image chat or a different HUANDENG Project uses the image, not JSON text. Ctrl+Alt+C copies the JSON parameters explicitly; it avoids the Ctrl+Shift+C DevTools shortcut. Image capture respects the rendered visual, multiple selection, and transparent background. Clipboard writes occur from Electron's native main process, and copy-then-paste awaits pending clipboard writes.

The feature uses the existing local Editor and Project writer; no additional service, agent connector or reverse proxy is needed. The installed, running 0.23.2/0.23.1 Editor is not modified by source development or publication.

## Delivery and compatibility

Version manifests and published source tag identify the exact build. The Windows ZIP must have a clean source identity and content manifest; the desktop module include list now bundles the native clipboard implementation. The two portable plugin packages are also version-aligned. Existing PPTD Projects, page histories, selected Drafts and remote Agent integrations are not rewritten by upgrading.

Recommended upgrade: close the Editor when ready, extract the new official Editor ZIP to its own folder, then run the bundled installer. The existing Windows shortcut and file association are updated while Project files remain untouched. If using DSH/Codex/Claude, install matching plugin ZIPs via their usual manager. Windows applications remain unsigned as in the previous release.

## Validation

The [validation record](VALIDATION-V0233.md) and GitHub tag CI retain actual test outcomes, including negative/failed attempts before correction. The published [Release](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.23.3) contains the complete Editor ZIP, Claude/Codex and DeepSeek plugin bundles and SHA256SUMS.txt.
