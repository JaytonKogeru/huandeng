# Slide Position fields

An ordinary text object can opt into a derived Main Slides position:

```yaml
elementType: text
content:
  field: main-position
  text: '12'
  fontSize: 10
```

`content.field` is authoritative. `content.text` remains a compatibility fallback; the current Editor and export use the derived `PageSnapshot.mainPosition`. Positions are one-based in the complete Main order, including hidden Slides. A Presentation occurrence keeps its Main position. Moving, inserting, hiding or removing another Slide does not rewrite this object's source.

The shared store derives the number from the manifest. The canvas, thumbnails, presenter, PDF/PNG renderer and native PPTX text mapping resolve the same field. An unavailable position displays an em dash. Ordinary numeric text remains ordinary text, and source, Story and Speaker Notes changes continue to produce normal history entries.

Properties → Text → **Use Slide Position** enables the field explicitly for the selected text object. Its font, color, bounds and alignment remain editable. Direct text editing is disabled while the field is active; turning it off freezes the currently displayed number as ordinary text.

Page History does not create a content version for a position-only change. A named checkpoint additionally archives its display position, outside content equality, with a context integrity hash. Historical and pinned views use that archived position. Restoring a version restores its field definition; the live page then uses its current Main position, without moving the page. Old versions without a position field preserve their literal text. A legacy version containing a position field but no recorded position displays an em dash rather than inventing a historical number.

There is no heuristic migration of digits, footers or page numbers. Existing objects are converted only through an explicit native transaction with stable page and element IDs. A conversion is one real content change. Subsequent Main-order changes leave the page revision and per-page history unchanged.
