# Editor 0.15 handoff

Editor and plugin 0.15.0 are installed and verified. The canonical Windows runtime is built from clean source `100659c513161356413eb9ef3707f6e772a64897`. [Validation](VALIDATION-V015.md) records the evidence and its limits.

## Installed delivery

- The canonical application is `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64/HUANDENG Editor.exe`; existing shortcuts and file associations target it. All 29,285 staged package files matched the accepted package before replacement.
- Both open Projects and the last active Project were restored. The actual installed window displayed the Chinese Project strip and Section browser. All 128 tracked private project source files and the unrelated dirty repository fixture retained their pre-replacement hashes.
- The installed bridge verified both Projects: 26 and 92 pages, 21 tools, two guides and writable context. This is protocol verification, not an agent model-task test.
- Codex and Claude Code retain the existing enabled local plugin at 0.15.0. The DeepSeek patch/launcher is prepared and verified without changing model profiles. The existing [private account plugin](https://chatgpt.com/plugins/plugins_6af0650a3a3c8191930513288c66ea4f) was updated and read back successfully.
- Rollback packages remain beside the canonical installation: `HUANDENG-v014-backup-20261109` and `HUANDENG-v015-first-backup-20261109`. Private installation, configuration, authoring and protocol receipts remain in the user's local HUANDENG data directory; they are not included in Git.

The original user window and final replacement window closed normally through their draft guards. During the first candidate installation, a newly launched hidden instance could not be targeted. After confirming its exact executable, process ownership, absence of user interaction and unchanged source hashes, only that newly launched process tree was stopped. A visible native launch restored the Projects. The final installer separates replacement from visible launch, and this recovery was not repeated.

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
- A private identifier was found in an early local planning commit. The outgoing milestone uses a sanitized aggregate with the original base as its sole parent, followed by the reviewed desktop-label fix and delivery evidence. The aggregate tree is identical to the reviewed corrected tree; the intermediate planning history stays local. This preserves reviewed source while sacrificing intermediate commit granularity in the published milestone.

ChatGPT Chat advisory bootstrap was unavailable; no question or project material was sent and no external advice was used. Implementation and verification used local source evidence.
