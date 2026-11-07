# OpenPPTD formula conversion

These modules are reused from [Shingwha/open-pptd](https://github.com/Shingwha/open-pptd), version 2.0.2, commit `5f027fc986f35924ea17da6b486ab5ea44ad7475`:

- `packages/model/mathml2omml.js`
- `packages/model/xml-parser.js`
- `packages/model/escape.js`

The source snapshot is the same one already vendored by the user's PPTD Editor. The pinned upstream [`package.json`](https://github.com/Shingwha/open-pptd/blob/5f027fc986f35924ea17da6b486ab5ea44ad7475/package.json) declares `"license": "MIT"`. The upstream README also states MIT. No separate upstream LICENSE file was present in that snapshot; `LICENSE` records the standard MIT terms associated with that declaration, without inventing an upstream copyright notice.

HUANDENG keeps the original implementation and explanatory comments, adds lint suppression for this third-party implementation, and provides a TypeScript declaration. KaTeX generates the MathML passed to this converter; arbitrary XML is not accepted through this adapter. No Microsoft Office XSLT file or Office binary is redistributed.

The adapter and regression tests outside this directory belong to HUANDENG.
