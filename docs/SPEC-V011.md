# HUANDENG v0.11 — authoring polish

## Goal and scope

Make an existing, authored Main Slides collection easier to organize and refine. Follow the same user journey in [Audit A](AUDIT-V011-A.md) and [Audit B](AUDIT-V011-B.md), implement focused changes, validate synthetic cases in the actual Windows app, and install a tested milestone. Private authoring work stays outside this repository and its distributable evidence.

## Product requirements

1. Put Presentation removal beside its name. Removing an arrangement retains Main Slides and versions; the explicit Project save/draft contract remains.
2. Use consistent Slide/Section wording and an expanded-state icon for the selection disclosure. Expose its state to keyboard and assistive technology.
3. Move routine organization drafts and empty-Presentation guidance into the corresponding context. A compact persistent draft control remains reachable. Genuine save conflicts, recovery failures, and actionable errors remain prominent.
4. Add an explicit Section-start mode bound to a stable `startPageId`. It resolves through the page before the next Section start in Main order, or the end. Existing fixed ranges and explicit memberships remain unchanged unless converted deliberately. Validate missing, duplicate, and overlapping starts.
5. Keep the Section's start Slide visible as its visual entry; a separate disclosure folds members without changing document order or exports. Search reveals matching members. Pages before the first Section remain visible.
6. Support blank-page insertion at first, middle, and final thumbnail gaps and from thumbnail context menus. Capture stable neighboring page identities, validate the intended adjacency, and preserve one Undo boundary.
7. Add a closable right-side read-only file preview for ordinary images and bounded text, including Markdown source, JSON, and command/script text. Retain the Slide and existing Inspector/Notes drafts. Reject outside-project paths, escaping links, unsupported binary formats, and unbounded reads; never execute file contents.
8. Expose Quick Layout through one disclosure. Reuse typography and geometry from an explicitly chosen authored text object, apply to an explicitly chosen target, preserve words/figures/background/other elements, and provide one Undo. Existing figure recipes remain available.
9. Add grouped common-document and open-license font presets while retaining custom font input. Settings shows samples and local availability with honest available/missing/unverified states. Listing a family does not imply its font files are bundled or available on other computers.
10. Keep Assets and Files as complementary views of the same Project. Preserve the existing image insertion writer and avoid a general-purpose code editor or arbitrary plugin runtime.

## Validation and publication

Exercise deletion/save, disclosure states, Section membership after insertion/movement, folding/search, exact-gap insertion and Undo, file-preview switching/draft preservation/path limits, authored style application/Undo, and font selection/availability. Retain writer CAS, recovery, animation, and layout persistence behavior. Use fabricated content for committed screenshots, fixtures, and reports.

Before publishing, inspect staged changes and current tracked evidence for private names, local paths, real source pages, images, and identifying per-page data. Preserve historical Git references; do not rewrite shared history as part of this milestone. Report any residual historical privacy scope separately. Publish only after focused checks, production packaging, and actual installation verification.

## Reference decisions

- [PowerPoint Sections](https://support.microsoft.com/en-us/powerpoint/training/organize-your-powerpoint-slides-into-sections): first-Slide boundaries and separate collapse controls are established interaction patterns; the ordinary editable cover remains visible in HUANDENG.
- [Local Font Access](https://developer.chrome.com/docs/capabilities/web-apis/local-fonts): use the existing local-font permission boundary and report unavailable access explicitly.
- [Microsoft font redistribution](https://learn.microsoft.com/en-us/typography/fonts/font-faq): installed document fonts may be selected; do not copy proprietary font binaries into this application.

Existing client/CLI/MCP integration remains the authoring path. Extension ideas are analysis only; no new model executor, marketplace, or public tunnel is part of this release.
