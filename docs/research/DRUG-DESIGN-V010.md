# Drug Design — v0.10 content and design plan

Checked 8 November 2026 (Australia/Sydney).

## Main Story

Purpose: Explain design routes and the evidence needed for a useful drug candidate.

Takeaway: Candidate generation, predicted binding, measured activity and developability answer different questions.

Audience: Computational molecular-design research group. Approximately 8–12 minutes.

## Composition

Ten authored 960 × 540 canvases. Arial, ivory, navy and teal. Native text, tables and exact process diagrams remain editable. No invented performance numbers, generated molecular structures or decorative stock pictures. Slide-specific scientific purpose determines the layout.

## Organisation

Three contiguous Sections cover slides 1–3, 4–6 and 7–10. A full Presentation references these Sections. A shorter Presentation references slides 1, 3, 7, 8 and 10 by stable ID. Visual review is recorded separately after rendering.

## Content

### 1. Drug Design

Purpose: Introduce the decision that connects molecular design to a useful candidate.

The central question is what evidence would justify the next experiment. This overview covers three molecular design routes and separates the job of each computational tool from the evidence needed for development. It is a conceptual comparison, not a benchmark or a claim that one model is universally best.

Sources: [FDA].

### 2. The design brief

Purpose: Define biological effect, target access, selectivity and developability before choosing a generator.

The design brief begins with a biological mechanism and the properties required in the intended setting. Potency matters in the context of exposure at the site of action. Selectivity and tolerability matter alongside the desired effect. Stability, solubility, expression or synthesis, formulation and delivery influence which designs can progress. These requirements can conflict, so the study should make its priorities explicit.

Sources: [FDA], [FDA-PROCESS].

### 3. Three molecular design routes

Purpose: Compare the objects, starting problems and constraints of the three formats.

These are common starting points rather than strict boundaries. Specialized chemistry and delivery can change which sites a modality reaches. The useful distinction is what is optimized and what establishes its function. Here, minibinder means a non-antibody protein binder. VHH and scFv belong to the antibody route even when they are physically small. The comparison is an author synthesis of documented tool scopes and experimental formats.

Sources: [FDA], [RF], [BINDCRAFT], [RFANTIBODY].

### 4. Small-molecule design

Purpose: Map molecular representation, generation, structure and affinity tools to their jobs.

RDKit provides molecular representation and cheminformatics. REINVENT4 supports molecular generation and optimization. Vina searches docking poses using a scoring function, while AlphaFold 3 predicts biomolecular complex structures. Boltz-2 provides a learned affinity output for protein–small-molecule complexes. OpenFE supports alchemical free-energy calculations. These estimates depend on the system and setup, and guide which compounds to make and measure. They do not establish biological efficacy.

Sources: [RDKIT], [REINVENT], [VINA], [AF3], [BOLTZ], [OPENFE].

### 5. Protein and minibinder design

Purpose: Show joint and modular design routes without implying a mandatory tool chain.

Protein design has both modular and integrated approaches. RFdiffusion established generative backbone design, with ProteinMPNN commonly used for sequence design. The current RFD4-Proteina release supports joint sequence–structure generation. BindCraft is an experimentally evaluated automated workflow for de novo binders. These are alternative routes with overlapping capabilities. Structural assessment and physical plausibility inform selection. Expression, specificity and the intended biological effect still need measurement.

Sources: [RF], [MPNN], [RFD4], [BINDCRAFT], [AF3].

### 6. Antibody design

Purpose: Explain the framework, CDR and format problem and distinguish design from developability.

Antibody design focuses on binding loops within a framework and a chosen molecular format. RFantibody combines computational design with experimental screening and characterization. RFD4-Proteina documents antibody CDR design as a supported task. TAP flags unusual calculated properties relative to clinical-stage antibodies, providing an early developability screen. Affinity optimization, format choice and functional evaluation continue after the first binder. The diagram is conceptual and does not depict a molecular structure or an experimental result.

Sources: [RFANTIBODY], [RFD4], [TAP].

### 7. A tool map by decision

Purpose: Make the output and purpose of each tool family explicit.

A generator proposes molecules. A structure model evaluates or proposes conformations. Docking scores, learned affinity estimates and alchemical free energies have different meanings and assumptions. Boltz-2's standard affinity output concerns protein–small-molecule binding. It is not a validated universal protein–protein affinity estimator. Property flags identify concerns that need further evaluation. This table is an author synthesis of the documented roles of representative tools.

Sources: [REINVENT], [RF], [RFD4], [BINDCRAFT], [MPNN], [AF3], [BOLTZ], [VINA], [OPENFE], [RDKIT], [TAP].

### 8. What the evidence establishes

Purpose: Separate confidence in predicted geometry, measured binding, function and development.

Confidence metrics describe aspects of a predicted structure. ipSAE derives interface confidence from predicted aligned errors rather than measuring binding free energy. Binding and kinetic measurements establish interaction under stated conditions. Functional readouts address the intended biological effect. Further development needs exposure, stability and safety evidence, followed by clinical evaluation. Evidence usually grows iteratively. Each row separates the claim directly supported by a readout from the next question.

Sources: [AF3], [IPSAE], [FDA], [FDA-PROCESS].

### 9. Candidate selection

Purpose: Present an explicit decision framework without fabricated scoring data.

This is a proposed decision framework, not an empirical benchmark. A shortlist depends on the biological question, experimental capacity and the failures that would stop development. Candidates should be compared within relevant molecular classes, with distinct evidence types kept visible. A useful next measurement can distinguish competing explanations or change the selected candidate. Molecular diversity helps avoid committing the whole study to one untested assumption.

Sources: [FDA], [BINDCRAFT], [RFANTIBODY], [TAP].

### 10. A useful first study

Purpose: Close with a practical research programme and the decision it should support.

A first study should deliver an inspectable choice of candidates and a plan for the evidence that comes next. Record model versions, molecular identities, assumptions and measured outcomes. For protein binders, a clear interaction is a useful initial goal. Therapeutic usefulness also depends on mechanism, delivery and developability. The same decision logic applies to small molecules and antibodies. This closing study plan is an author synthesis, not a prescribed experimental protocol.

Sources: [FDA], [FDA-PROCESS].

## Scientific decisions

- Distinguish non-antibody minibinders from VHH and scFv.
- Keep structural confidence, affinity, biological activity and developability as distinct claims.
- Describe Boltz-2's standard affinity scope as protein–small-molecule binding.
- Treat model capabilities as documented tool features rather than evidence of clinical efficacy.
- Do not compare success percentages across incompatible studies or use a stable short MD trajectory as proof of affinity.
- The candidate-selection and first-study slides are author synthesis, not empirical benchmarks or experimental protocols.

## References

### FDA

US FDA. Discovery and Development

https://www.fda.gov/patients/drug-development-process/step-1-discovery-and-development

Scope: Mechanism, exposure, benefits, toxicity and administration requirements.

### FDA-PROCESS

US FDA. The Drug Development Process

https://www.fda.gov/patients/learn-about-drug-and-device-approvals/drug-development-process

Scope: Discovery, preclinical and clinical research, review and safety monitoring.

### RF

Watson et al. De novo design of protein structure and function with RFdiffusion. Nature (2023)

https://doi.org/10.1038/s41586-023-06415-8

Scope: Generative protein-backbone design.

### BINDCRAFT

Pacesa et al. One-shot design of functional protein binders with BindCraft. Nature (2025)

https://doi.org/10.1038/s41586-025-09429-6

https://pmc.ncbi.nlm.nih.gov/articles/PMC12507698/

Scope: An experimentally evaluated, automated binder-design workflow.

### RFANTIBODY

Bennett et al. Atomically accurate de novo design of antibodies with RFdiffusion. Nature 649, 183–193 (2026), online 5 November 2025

https://doi.org/10.1038/s41586-025-09721-5

https://github.com/RosettaCommons/RFantibody

Scope: Computational antibody design combined with experimental screening and characterization.

### RDKIT

RDKit. Overview

https://www.rdkit.org/docs/Overview.html

Scope: Molecular representation and cheminformatics.

### REINVENT

Loeffler et al. REINVENT 4: Modern AI-driven generative molecule design. Journal of Cheminformatics (2024)

https://doi.org/10.1186/s13321-024-00812-5

https://github.com/MolecularAI/REINVENT4

Scope: Generative molecular design and optimization.

### VINA

AutoDock Vina. Official documentation

https://autodock-vina.readthedocs.io/en/latest/

Scope: Molecular docking and scoring.

### AF3

Abramson et al. Accurate structure prediction of biomolecular interactions with AlphaFold 3. Nature (2024)

https://doi.org/10.1038/s41586-024-07487-w

Scope: Complex-structure prediction and structural confidence.

### BOLTZ

Boltz-2. Official model repository and accompanying paper

https://github.com/jwohlwend/boltz

https://pmc.ncbi.nlm.nih.gov/articles/PMC12262699/

Scope: Biomolecular structure and protein–small-molecule affinity prediction.

### OPENFE

OpenFE. Official documentation

https://docs.openfree.energy/en/latest/

Scope: Planning, running and analyzing alchemical free-energy calculations.

### RFD4

NVIDIA and Baker Laboratory. RFD4-Proteina documentation and model card

https://docs.nvidia.com/nim/bionemo/rfd4-proteina/overview

https://huggingface.co/nvidia/RFD4-Proteina-Diffusers

Scope: Joint sequence–structure generation and documented design tasks. Model card identifies 2026-10-19 weights.

### MPNN

Dauparas et al. Robust deep learning-based protein sequence design using ProteinMPNN. Science (2022)

https://doi.org/10.1126/science.add2187

https://github.com/dauparas/ProteinMPNN

Scope: Protein-sequence design conditioned on backbone structure.

### TAP

Raybould et al. Five computational developability guidelines for therapeutic antibody profiling. PNAS (2019)

https://doi.org/10.1073/pnas.1810576116

https://pmc.ncbi.nlm.nih.gov/articles/PMC6410772/

Scope: Calculated antibody developability flags relative to clinical-stage antibodies.

### IPSAE

Dunbrack. Res ipSAE loquunt: What's wrong with AlphaFold's ipTM score and how to fix it. bioRxiv (2025)

https://doi.org/10.1101/2025.02.10.637595

https://github.com/DunbrackLab/IPSAE

Scope: Interface-confidence assessment from predicted aligned errors.

## Sources and visual review checklist

Record actual outcomes in the version validation report. Capturing a slide or passing geometry checks is not author approval.

- Match each factual statement to the cited primary publication or official documentation in its speaker notes.
- Keep RFD4-Proteina capabilities separate from experimental validation, and Boltz-2 affinity claims within the documented small-molecule scope.
- Inspect every rendered page for hierarchy, readable type, wrapping, table fit, connector placement and deliberate whitespace.
- Confirm that the stable Slide ID footer remains unchanged when the five-slide Presentation reuses Main Slides.
- Confirm full order DD01–DD10 and briefing order DD01, DD03, DD07, DD08, DD10.
- Read source citations in Presenter notes and verify that the ten-page and five-page PDF exports match the selected collection.
- Reopen the project and confirm that Main Slides, Sections and both Presentations retain their identities.

Schema: `.page` and `.pptd` use JSON as valid YAML. The internal `label` alias must be an S number, while the authored slide title lives in the page content. Sections use stable boundary IDs with a pageIds compatibility cache. Stable UUIDs and display IDs are deterministic for this example.

Run the isolated desktop harness with `HUANDENG_DESKTOP_EXE` set to the candidate executable, then `node scripts/verify-drug-design-v010.mjs --exports`. `HUANDENG_DESKTOP_APP` may identify an unpackaged Electron app. Omit `--exports` for UI, notes, slide screenshots and persistence checks only.
