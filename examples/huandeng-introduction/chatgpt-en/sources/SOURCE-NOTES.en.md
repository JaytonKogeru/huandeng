# Sources and provenance for the English introduction

This note travels with the editable project. It explains which material supplies the story, which supplies evidence, and which records code or design attribution. It does not certify the final slides or exports.

## The author's account and the editorial narrative

The unchanged [founder's spoken account](story/USER-STORY.zh-CN.md) is the narrative source. It is in Chinese. English wording, transitions and the placement of short Editor demonstrations are editorial work built from that account, not new quotations from the founder.

The account connects recognizable AI-style slides at group meetings, the desire to retain the speaker's judgment, the two-edits-in-fifty-pages scenario, page identity and history, original material, and continued collaboration with agents. The fifty/two scenario is the author's example, not a timed benchmark. The [product fact brief](story/FACTS.md) supplies separately checked technical distinctions.

The project instructions are in [AGENTS.md](../AGENTS.md). The English edition has its own narrative and page boundaries. A translated copy of the Chinese page sequence is not required.

## Code, ideas and acknowledgments

The complete [acknowledgments and design references](ACKNOWLEDGMENTS.md) preserves the original fifteen named credits and all thirty-three historical research references. It explains specific contributions rather than treating the list as one dependency or artwork collection.

OpenSlide is the Editor code foundation. The PPTD approach encountered through the Kimi ecosystem is an idea/format reference. OpenPPTD contributes three formula-conversion modules, and PptxGenJS supplies PowerPoint generation. OpenSlides Studio, at openslides.dev, is a separate operations/identity reference. OPF informed version and transaction design.

Apache ECharts, KaTeX and Font Awesome have their own runtime roles. The scientific plot described below was generated with Python, NumPy and Matplotlib; it is not an ECharts screenshot or a curve drawn from slide shapes. Retained terms are in the [desktop notices](../notices/desktop-NOTICE.md), [OpenPPTD notice](../notices/open-pptd-NOTICE.md) and [project license](../LICENSE).

## The independently acquired public scientific example

The current source directory is [independent-20261111](independent-20261111/). Its [acquisition record](independent-20261111/ACQUISITION.json) records a fresh download by the ChatGPT author from [RCSB PDB 1BNA](https://www.rcsb.org/structure/1BNA), reused within that same author's English and Chinese editions. It is not an input copied from the Claude Code or DeepSeek artwork libraries.

| Local file | Role |
| --- | --- |
| [1BNA.pdb](independent-20261111/1BNA.pdb) | Deposited coordinates downloaded from RCSB; the acquisition record retains the original URL and hash. |
| [paired-c1-distances.csv](independent-20261111/paired-c1-distances.csv) | Twelve Euclidean C1′–C1′ distances, pairing chain A residues 1–12 with antiparallel chain B residues 24–13, in ångströms. |
| [generate_science.py](independent-20261111/generate_science.py) | NumPy calculation and Matplotlib figure generation; running it downloads the public source again and writes the derived files. |
| [c1-distances-en.svg](independent-20261111/c1-distances-en.svg) and [PNG](independent-20261111/c1-distances-en.png) | English plot generated from those twelve values. |
| [1bna-projected-bonds.svg](independent-20261111/1bna-projected-bonds.svg) and [PNG](independent-20261111/1bna-projected-bonds.png) | Principal-axis projection of the coordinates, with same-chain distance-based connections and links between paired C1′ positions. |

The measurements describe one static crystallographic structure. The twelve positions are not experimental replicates, the plot has no estimated replicate uncertainty, and the C1′ distances are not hydrogen-bond lengths. The structure illustration's distance-based connections do not encode chemical bond order. These distinctions are documented so the figure can be explained and reproduced accurately.

Citation: Drew et al. (1981), *PNAS* 78, 2179–2183, [doi:10.1073/pnas.78.4.2179](https://doi.org/10.1073/pnas.78.4.2179); [PDB 1BNA](https://www.rcsb.org/structure/1BNA). The example demonstrates keeping original data and derived evidence with an editable project; DNA analysis is not the introduction's main subject.

## Current evidence and retained history

Older `science/`, `brand/` and `reference/` folders remain with their historical records. Their presence does not establish independent acquisition for this revision. The current scientific acquisition is recorded separately above. Retained history is not a source pool for new cross-author artwork.

[Visual provenance](visual-provenance.json) records image files actually used in the saved Main and resolved short Presentation, together with their page/object uses and acquisition or derivation information. Retained historical media outside those sequences is not included as current evidence.

Current UI teaching uses the author's own captures of the actual project. A screenshot records a particular Editor state; a conceptual drawing explains a relationship. Neither should be presented as the other. The existing 0.19 Editor captures and the 0.20 candidate Rules captures retain their own runtime context; a new candidate does not retroactively relabel older interface pixels.

Private research projects were consulted as design references only. Their scientific artwork and private files are not public material sources. Keep the complete project folder when continuing this work so the source data, Notes, notices and meaningful page history remain available.
