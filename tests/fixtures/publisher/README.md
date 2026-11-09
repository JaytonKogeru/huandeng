# Synthetic publisher fixture

`package.pptx` is a small synthetic ZIP package for publication-integrity tests. It contains one slide part and one notes part, with fixed timestamps and generic XML content. The tests inspect member checksums, the central directory and required presentation parts. This fixture is not an Office visual-acceptance sample.

Full native PPTX and PowerPoint acceptance use the independent scientific-object fixture and packaged export harnesses described in `docs/POWERPOINT-COMPARISON.md`.
