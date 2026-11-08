# v0.10 object interaction implementation

## Scope and shared commands

The object context menu is attached to the existing PPTD canvas and routes its actions into the editor's existing command dispatcher. It does not write files or maintain a second document model. Copy/cut/duplicate/group/delete retain the established writer/clipboard/animation-aware paths. Paste and Properties are explicit menu commands wired by the route.

`app/lib/pptd-object-actions.ts` supplies pure operations:

- `textFormatPatches(elements, selectedIds, command, theme?)` returns element field patches. It changes only selected text objects, resolves theme text styles, toggles mixed flags together, clamps font size to the existing 1–400 range, and leaves rich-text content intact. The route commits all patches in one writer transaction.
- `reorderElementIds(elements, selectedIds, direction)` returns a complete ID permutation. Forward/backward cross one sibling layer; front/back move to sibling extremes. A group and its descendants move together. A selected individual member stays within its parent. Unselected elements retain their relative order, including in legacy interleaved group layouts.
- `effectiveTextContent` provides the same theme-style merge required by quick formatting. The route must use a page theme override when present.

The editor keyboard resolver handles Ctrl/Cmd+B/I/U, Ctrl/Cmd+Shift+>/< and Ctrl/Cmd+[ / ]. Shift on the bracket commands selects front/back extremes. Text inputs, contenteditable, dialogs, thumbnail controls, IME composition and presentation mode retain their established ownership. Ctrl/Cmd+V is deliberately left to the native paste event; the menu's Paste command invokes the same clipboard import path.

## Menu and focus

`object-context-menu.tsx` uses the existing Base UI context-menu components and dependency. The canvas resolves the hit object through existing group ownership, retains an existing multiselection when appropriate, and opens the menu on right-click or Shift+F10/Menu. It suppresses the object menu inside inline text editing so native text selection and text editing shortcuts remain usable.

The menu includes whole-object text bold/italic/underline, font size, named colors and a custom color picker, copy/cut/paste/duplicate, four layer moves, group/ungroup, Properties and Delete. Readonly mode disables edits while allowing copy and inspection. Menu focus returns to a selected canvas object, except Properties delegates focus to the inspector.

## Inspector organization

Properties, Layers, Story and Checks are separate accessible tabs with arrow/Home/End navigation. Tabpanels remain mounted when hidden; changing views does not discard a Story or chart draft. The controlled `tab`/`onTabChange` props let the route open Properties from the context menu and open Story for a pending draft.

The optional `onCollapse` control lives in the inspector header. The route owns reopening and layout sizing. Story and Checks have explicit content slots; layout recipes stay in an initially collapsed Layout tools disclosure in Properties. Checks are described as file, font and layout diagnostics. Layer ordering controls appear in both Properties and Layers and invoke the same callback.

## Underline data and exports

Whole-object underline is persisted as `content.underline`, alongside existing bold/italic. Renderer `textCss` applies it and native PPTX export propagates it into run styles. Existing inline `<u>` markup remains meaningful when the object-wide flag is off. Rich runs and multiline source text are not rewritten by the toggle.

## Verification

Added focused tests cover sibling and nested-group layer ordering, multiselection boundaries, legacy interleaving, inherited text formatting, size bounds, color validation, keyboard scope/IME/presentation boundaries, browser multiline underline and native PPTX run formatting. They specifically check source preservation and inline emphasis compatibility.

Six direct assertions against the actual pure helper source passed with Node's built-in TypeScript stripping during development. Full Vitest, TypeScript, Biome and desktop acceptance are pending the release owner's Windows gates; no desktop success is claimed by this note until those results are attached to the release validation.

All source paths prefixed `app/` are relative to `packages/core/src/`. Existing AGENTS/release policy applies: source checks and a changeset before the milestone commit, then independently verified packaging, installation and private-origin release.
