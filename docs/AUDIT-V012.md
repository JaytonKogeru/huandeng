# HUANDENG v0.12 audit

## Scope

The next milestone follows real authoring feedback on organizing a long Main Slides collection, selecting text, and using external clients. The accepted baseline is editor v0.11.0. Private authoring sources and scientific review remain outside this repository. The audit uses the current installed application for observation and fabricated Projects for reproducible tests.

## Findings

| User task | Observed or source-confirmed problem | Decision |
| --- | --- | --- |
| Recognize a folded Section | Titles have no derived Section Position, and stable IDs are hard to discover | Show a derived numbered label and expose the stable Section ID |
| Separate introductory material | There is no explicit front-matter designation | Add an optional frontMatter marker for Section 00 |
| Fold a distant Section | The thumbnail layout effect follows the old selected Slide whenever visible keys change | Follow an explicit selection change; preserve the folded heading and scroll anchor |
| Create a Section at a gap | Gap context menus only insert a Slide | Start a Section at the following existing Slide after confirming its title and range |
| Move a Slide upward | Only thumbnail buttons accept drops, always interpreted as after the target | Show before/after insertion positions, accept gap drops, and scroll at the rail edges |
| Emphasize a selected phrase | Rich text has inline emphasis controls, but no scoped color/highlight action | Retain the selection through a scoped context menu and share the editor Undo path |
| Zoom while editing | Ctrl-wheel has no canvas zoom behavior | Add bounded, cursor-anchored canvas zoom without consuming ordinary or Shift scrolling |
| Use a copied client plugin | Portable launchers need an explicit CLI path | Discover a local installation and verify the active Project before binding |
| Use HUANDENG in ChatGPT | Existing source adapters do not themselves create an account plugin | Package the shared skill with the existing authorized workstation app binding |

## Boundaries

Section IDs remain stable. Section Positions and Slide Positions are derived from the current Main order. The front-matter marker does not convert every first Section to zero. Existing fixed membership and range Sections retain their semantics.

The user has authorized client plugin creation and local installation. Account creation, host installation, MCP connectivity, and a successful authoring task are separate claims and require separate evidence. The ChatGPT adapter reuses the authorized workstation connection. Local client packages bind to the local Editor. No public listener, reverse proxy, or tunnel is introduced.

Private source pages, figures, citations tied to private work, screenshots, IDs, paths, and authoring receipts stay outside Git and distributable plugin archives. This milestone does not rewrite historical Git objects or change repository visibility.
