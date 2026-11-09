# Editor 0.15 handoff

Delivery is in progress; [Validation](VALIDATION-V015.md) distinguishes completed checks from remaining installation work.

## Workflow and invariants

Select Project and collection → choose Edit / Section browser / Notes page → inspect reference and intent → edit through the existing writer → review actual saved changes → inspect rendered pages → rehearse from the beginning or current page. [The walkthrough](UI-WALKTHROUGH-V015.md) explains the interface.

- One shared revision-checked writer; no second notes, order, page or review store.
- UI language is separate from authored language. Stable identity is separate from Position, occurrence identity and pinned version identity.
- Slides stays open; explicit Project/window close retains the original draft guard.
- Main browser moves are explicit buttons/Alt arrows; rail drag remains. Filtered or collapsed browser groups block ambiguous moves.
- Interactive animation is not native PowerPoint animation export. Existing advanced keyframes and static export limits remain.
- Plugin configuration, protocol discovery and actual model execution are separate evidence. New chats may be needed to load updated instructions.

## Recorded execution decisions

- The user's request authorizes the full audit/spec/implementation/acceptance workflow, including the repository's established milestone delivery. No additional planning approval was inserted. If scope was misunderstood, the local source changes remain reviewable and reversible.
- Git Bash was unavailable, so review packages and the ledger use native PowerShell/Node files in this plan's ignored directory. The cost is manual bookkeeping; scoped records are retained because cleanup was previously blocked.
- Private project corrections remain outside Git and outside advisory consultations. The tradeoff is that their detailed evidence is local to the user's workstation.
- Confirmed navigation-title and Story-search defects were included in the view task. This expands the bounded helper change and requires numeric-heading regression coverage; it does not rewrite authored text.
- Explicit move buttons and Alt-arrow sorting satisfy Main browser reordering without adding a new drag system. Browser search/collapse/size preferences reset on exit while selection persists; persistent view preferences remain later work.

ChatGPT Chat advisory bootstrap was unavailable; no question or project material was sent and no external advice was used. Implementation and verification used local source evidence.
