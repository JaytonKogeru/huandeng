# HUANDENG — GitHub and version policy

The GitHub repository tracks EDITOR SOURCE and VERSION MILESTONES, not every slide modification.

## Three distinct histories

- Automatic saves and Undo/Redo: the current working document plus the local operation journal for recovery and short editing sessions. These are not named page versions.
- Named PPTD page versions: explicit milestones saved in `.huandeng/checkpoints/` with content-addressed images in `media/.huandeng-versions/`. They move with the project directory and do not require Git. Restoring changes only that page; it does not automatically create another named version.
- Git commits: editor code, documentation and verified release states, or an optional project-level source checkpoint. Commit locally whenever helpful. Neither normal slide autosave nor a named page version automatically pushes to GitHub.

## Remote upload cadence
1. Develop and commit locally; keep user page files separate from editor code.
2. At a meaningful release milestone, run focused checks and one realistic desktop workflow.
3. Update release notes/handoff with completed work, known gaps and verification.
4. Push main to origin ONCE for that milestone. Tag editor-vX.Y.Z. Do not push on every save, commit, or UI tweak.
5. Never push to upstream (OpenSlide) or run the inherited npm publication workflow. CI should stay small.

Initial milestone: HUANDENG Editor v0.2.0 (Electron desktop, PPTD pages, per-page history, project tree, agent-maintained Story). The editor milestone tag is not an npm package version.

The repository became public for the user-authorized 0.22 release on 2026-11-12, after a licensing and source audit. Its existing history and upstream attribution are retained.

A user-authorized plugin/example-only milestone uses a plugin-vX.Y.Z tag, records its narrower scope, and leaves the Editor version/tag unchanged. Example review candidates retain their author-acceptance status independently of release packaging.
