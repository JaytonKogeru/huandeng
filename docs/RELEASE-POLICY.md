# HUANDENG — GitHub and version policy

The GitHub repository tracks EDITOR SOURCE and VERSION MILESTONES, not every slide modification.

## Two distinct histories
- Git commits: editor code, documentation and verified release states. Commit locally whenever helpful.
- PPTD page history: visual timeline of an individual slide, previewable and restorable inside the editor. This is local application data, not automatically synchronized to GitHub.

## Remote upload cadence
1. Develop and commit locally; keep user page files separate from editor code.
2. At a meaningful release milestone, run focused checks and one realistic desktop workflow.
3. Update release notes/handoff with completed work, known gaps and verification.
4. Push main to origin ONCE for that milestone. Tag editor-vX.Y.Z. Do not push on every save, commit, or UI tweak.
5. Never push to upstream (OpenSlide) or run the inherited npm publication workflow. CI should stay small.

Initial milestone: HUANDENG Editor v0.2.0 (Electron desktop, PPTD pages, per-page history, project tree, agent-maintained Story). The editor milestone tag is not an npm package version.

The repository starts PRIVATE. Consider public visibility only after a licensing and source audit.