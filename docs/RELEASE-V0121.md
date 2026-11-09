# HUANDENG Editor 0.12.1 — authoring polish

**Accepted and installed:** Editor 0.12.1, clean runtime source `c82b36885ed125c348b3a5e110aff141f221d515`, built `2026-11-08T23:57:51.4525420Z`. The separate delivery-only commit records documentation and sanitized synthetic evidence.

## User-visible changes

| Area | Behavior |
| --- | --- |
| Text selection | A solid blue selection and white text make keyboard and mouse selections clear, including formatted text. Saved text styles are preserved. |
| Folded Sections | The first-Slide preview has offset card edges and retains its Slide count. Folding preserves the rail anchor and selected Slide. |
| Create Section here | Available at every Main Slides gap. Before an existing Section or at the end, a new cover and stable Section boundary are created in one saved action; one Undo removes both. |
| Hide slide | Pages context menus can hide or show a Slide. Hidden Slides remain editable and retain their IDs, content, Notes, Story and Section membership. |
| Delivery | Playback and collection PDF/PPTX/MP4 omit hidden Slides by default. Export can include them explicitly; direct single-page output remains available. |
| Page Version History | Existing named snapshots remain explicit authoring milestones. Their UI visibility, archived artwork and persistence after normal reopen are verified. |

The code and public evidence use only synthetic material. Personal Project editing remains outside this repository. Existing client plugin 0.12.1 continues using the same installed Editor writer; this patch adds no network service or plugin installation requirement.

## Compatibility

`metadata.hidden` is current organization state. A Main Slide's visibility applies to live and pinned Presentation appearances. Restoring a named artwork version preserves its current visibility. Folding a Section changes only navigation, not playback or delivery.

New `page.add.section` is optional and additive. Existing Slide creation remains unchanged. Section identity and first-Slide anchors remain stable; older fixed-range/member semantics are preserved. The GUI revalidates captured neighbors after flushing drafts, and the shared transaction retains metadata/manifest revisions, journal recovery and Undo.

See [Audit, specification and implementation](AUTHORING-V0121.md), [Validation](VALIDATION-V0121.md), and [Handoff](HANDOFF-V0121.md). The exact package passed all seven UI groups, two launches and two normal exits. Guarded installation retained the previous application, preserved the current Project and ordinary profile, verified installed byte identity, and reopened a fresh writable service. Origin delivery and actual refs are verified by integration.
