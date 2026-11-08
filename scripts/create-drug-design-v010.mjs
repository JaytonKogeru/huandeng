import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const output = path.resolve(
  args.find((arg) => !arg.startsWith('--')) ?? path.join(root, 'examples/drug-design-v010'),
);
const replace = args.includes('--replace');
const palette = {
  paper: '#F7F6F1',
  ink: '#172C3B',
  muted: '#536571',
  teal: '#187D80',
  orange: '#BB653D',
  rule: '#C9D5D4',
  tint: '#E5EFEB',
  white: '#FFFFFF',
};
const references = [
  {
    id: 'FDA',
    title: 'US FDA. Discovery and Development',
    url: 'https://www.fda.gov/patients/drug-development-process/step-1-discovery-and-development',
    scope: 'Mechanism, exposure, benefits, toxicity and administration requirements.',
  },
  {
    id: 'FDA-PROCESS',
    title: 'US FDA. The Drug Development Process',
    url: 'https://www.fda.gov/patients/learn-about-drug-and-device-approvals/drug-development-process',
    scope: 'Discovery, preclinical and clinical research, review and safety monitoring.',
  },
  {
    id: 'RF',
    title:
      'Watson et al. De novo design of protein structure and function with RFdiffusion. Nature (2023)',
    url: 'https://doi.org/10.1038/s41586-023-06415-8',
    scope: 'Generative protein-backbone design.',
  },
  {
    id: 'BINDCRAFT',
    title:
      'Pacesa et al. One-shot design of functional protein binders with BindCraft. Nature (2025)',
    url: 'https://doi.org/10.1038/s41586-025-09429-6',
    alternate: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12507698/',
    scope: 'An experimentally evaluated, automated binder-design workflow.',
  },
  {
    id: 'RFANTIBODY',
    title:
      'Bennett et al. Atomically accurate de novo design of antibodies with RFdiffusion. Nature 649, 183–193 (2026), online 5 November 2025',
    url: 'https://doi.org/10.1038/s41586-025-09721-5',
    alternate: 'https://github.com/RosettaCommons/RFantibody',
    scope:
      'Computational antibody design combined with experimental screening and characterization.',
  },
  {
    id: 'RDKIT',
    title: 'RDKit. Overview',
    url: 'https://www.rdkit.org/docs/Overview.html',
    scope: 'Molecular representation and cheminformatics.',
  },
  {
    id: 'REINVENT',
    title:
      'Loeffler et al. REINVENT 4: Modern AI-driven generative molecule design. Journal of Cheminformatics (2024)',
    url: 'https://doi.org/10.1186/s13321-024-00812-5',
    alternate: 'https://github.com/MolecularAI/REINVENT4',
    scope: 'Generative molecular design and optimization.',
  },
  {
    id: 'VINA',
    title: 'AutoDock Vina. Official documentation',
    url: 'https://autodock-vina.readthedocs.io/en/latest/',
    scope: 'Molecular docking and scoring.',
  },
  {
    id: 'AF3',
    title:
      'Abramson et al. Accurate structure prediction of biomolecular interactions with AlphaFold 3. Nature (2024)',
    url: 'https://doi.org/10.1038/s41586-024-07487-w',
    scope: 'Complex-structure prediction and structural confidence.',
  },
  {
    id: 'BOLTZ',
    title: 'Boltz-2. Official model repository and accompanying paper',
    url: 'https://github.com/jwohlwend/boltz',
    alternate: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12262699/',
    scope: 'Biomolecular structure and protein–small-molecule affinity prediction.',
  },
  {
    id: 'OPENFE',
    title: 'OpenFE. Official documentation',
    url: 'https://docs.openfree.energy/en/latest/',
    scope: 'Planning, running and analyzing alchemical free-energy calculations.',
  },
  {
    id: 'RFD4',
    title: 'NVIDIA and Baker Laboratory. RFD4-Proteina documentation and model card',
    url: 'https://docs.nvidia.com/nim/bionemo/rfd4-proteina/overview',
    alternate: 'https://huggingface.co/nvidia/RFD4-Proteina-Diffusers',
    scope:
      'Joint sequence–structure generation and documented design tasks. Model card identifies 2026-10-19 weights.',
  },
  {
    id: 'MPNN',
    title:
      'Dauparas et al. Robust deep learning-based protein sequence design using ProteinMPNN. Science (2022)',
    url: 'https://doi.org/10.1126/science.add2187',
    alternate: 'https://github.com/dauparas/ProteinMPNN',
    scope: 'Protein-sequence design conditioned on backbone structure.',
  },
  {
    id: 'TAP',
    title:
      'Raybould et al. Five computational developability guidelines for therapeutic antibody profiling. PNAS (2019)',
    url: 'https://doi.org/10.1073/pnas.1810576116',
    alternate: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6410772/',
    scope: 'Calculated antibody developability flags relative to clinical-stage antibodies.',
  },
  {
    id: 'IPSAE',
    title:
      "Dunbrack. Res ipSAE loquunt: What's wrong with AlphaFold's ipTM score and how to fix it. bioRxiv (2025)",
    url: 'https://doi.org/10.1101/2025.02.10.637595',
    alternate: 'https://github.com/DunbrackLab/IPSAE',
    scope: 'Interface-confidence assessment from predicted aligned errors.',
  },
];
const byReference = new Map(references.map((reference) => [reference.id, reference]));

function text(id, value, bounds, size = 22, options = {}) {
  return {
    elementId: id,
    elementType: 'text',
    bounds,
    content: {
      text: value,
      fontFamily: 'Arial',
      fontSize: size,
      lineHeight: 1.18,
      color: palette.ink,
      ...options,
    },
  };
}

function line(id, x1, y1, x2, y2, options = {}) {
  const width = Math.max(1, Math.abs(x2 - x1));
  const height = Math.max(1, Math.abs(y2 - y1));
  return {
    elementId: id,
    elementType: 'line',
    bounds: [Math.min(x1, x2), Math.min(y1, y2), width, height],
    viewBox: [width, height],
    points: `${x1 <= x2 ? 0 : width},${y1 <= y2 ? 0 : height} ${x1 <= x2 ? width : 0},${y1 <= y2 ? height : 0}`,
    border: { width: 1.5, color: palette.rule, style: 'solid', ...options.border },
    arrow: options.arrow ? [null, 'arrow'] : [],
  };
}

function table(id, bounds, values, widths, heights, fontSize = 19) {
  return {
    elementId: id,
    elementType: 'table',
    bounds,
    columnWidths: widths,
    rowHeights: heights,
    rows: values.map((row) => row.map((value) => ({ text: value }))),
    style: {
      cellStyle: {
        fontFamily: 'Arial',
        fontSize,
        lineHeight: 1.14,
        color: palette.ink,
        align: ['left', 'middle'],
        border: [null, null, { width: 1, color: palette.rule, style: 'solid' }, null],
      },
      firstRowStyle: {
        fontSize: 16,
        color: palette.muted,
        bold: true,
        border: [null, null, { width: 2, color: palette.teal, style: 'solid' }, null],
      },
      firstColumnStyle: { color: palette.teal, bold: true },
    },
  };
}

function node(id, value, bounds, options = {}) {
  const { fill = palette.tint, color = palette.ink, fontSize = 23 } = options;
  return [
    {
      elementId: `${id}-boundary`,
      elementType: 'shape',
      shapeName: 'rect',
      bounds,
      fill: { type: 'solid', color: fill },
      border: { width: 0, color: fill },
    },
    text(
      `${id}-label`,
      value,
      [bounds[0] + 14, bounds[1] + 10, bounds[2] - 28, bounds[3] - 20],
      fontSize,
      { bold: true, color, align: ['center', 'middle'] },
    ),
  ];
}

function notes(copy, ids) {
  return `${copy}\n\nSources\n${ids
    .map((id) => {
      const source = byReference.get(id);
      assert.ok(source, `Unknown source: ${id}`);
      return `[${id}] ${source.title}\n${source.url}${source.alternate ? `\n${source.alternate}` : ''}`;
    })
    .join(
      '\n\n',
    )}\n\nSource check: 8 November 2026. Representative tools, not an exhaustive ranking.`;
}

function page(index, slug, title, purpose, elements, copy, sources, options = {}) {
  return {
    id: `d0100000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    code: `DD${String(index).padStart(2, '0')}`,
    path: `pages/${String(index).padStart(2, '0')}-${slug}.page`,
    title,
    purpose,
    sources,
    narration: copy,
    data: {
      title,
      background: { type: 'solid', color: options.background ?? palette.paper },
      elements: [
        ...(options.cover
          ? []
          : [
              text('title', title, [48, 38, 864, 58], 35, { bold: true }),
              line('heading-rule', 48, 112, 912, 112),
            ]),
        ...elements,
        text('slide-id', `Slide ID DD${String(index).padStart(2, '0')}`, [780, 505, 132, 19], 12, {
          color: options.dark ? '#BCD1DA' : palette.muted,
          align: ['right', 'middle'],
        }),
      ],
      notes: notes(copy, sources),
    },
  };
}

const slides = [
  page(
    1,
    'drug-design',
    'Drug Design',
    'Introduce the decision that connects molecular design to a useful candidate.',
    [
      text('title', 'Drug\nDesign', [56, 66, 610, 180], 77, {
        bold: true,
        color: palette.white,
        lineHeight: 1.02,
      }),
      text(
        'subtitle',
        'How a designed molecule becomes\na useful candidate',
        [61, 286, 760, 82],
        31,
        {
          color: '#D8E8EC',
        },
      ),
      text('formats', 'Small molecules, protein binders and antibodies', [61, 438, 786, 35], 20, {
        color: '#A8C8CE',
      }),
    ],
    'The central question is what evidence would justify the next experiment. This overview covers three molecular design routes and separates the job of each computational tool from the evidence needed for development. It is a conceptual comparison, not a benchmark or a claim that one model is universally best.',
    ['FDA'],
    { cover: true, dark: true, background: palette.ink },
  ),
  page(
    2,
    'design-brief',
    'The design brief',
    'Define biological effect, target access, selectivity and developability before choosing a generator.',
    [
      text('effect-title', 'Desired effect', [48, 155, 400, 34], 25, {
        bold: true,
        color: palette.teal,
      }),
      text('effect-copy', 'Change a disease-relevant\nbiological process.', [48, 201, 400, 70], 24),
      text('access-title', 'Target access', [524, 155, 388, 34], 25, {
        bold: true,
        color: palette.teal,
      }),
      text(
        'access-copy',
        'Reach the relevant tissue\nand molecular site.',
        [524, 201, 388, 70],
        24,
      ),
      line('middle-rule', 48, 293, 912, 293),
      text('selectivity-title', 'Selectivity', [48, 324, 400, 34], 25, {
        bold: true,
        color: palette.teal,
      }),
      text(
        'selectivity-copy',
        'Separate the intended effect\nfrom harmful interactions.',
        [48, 370, 400, 70],
        24,
      ),
      text('feasibility-title', 'Developability', [524, 324, 388, 34], 25, {
        bold: true,
        color: palette.teal,
      }),
      text(
        'feasibility-copy',
        'Support a stable, manufacturable\nand deliverable molecule.',
        [524, 370, 388, 70],
        24,
      ),
    ],
    'The design brief begins with a biological mechanism and the properties required in the intended setting. Potency matters in the context of exposure at the site of action. Selectivity and tolerability matter alongside the desired effect. Stability, solubility, expression or synthesis, formulation and delivery influence which designs can progress. These requirements can conflict, so the study should make its priorities explicit.',
    ['FDA', 'FDA-PROCESS'],
  ),
  page(
    3,
    'molecular-routes',
    'Three molecular design routes',
    'Compare the objects, starting problems and constraints of the three formats.',
    [
      table(
        'modality-comparison',
        [48, 139, 864, 302],
        [
          ['Route', 'Design object', 'Typical starting point', 'Early constraint'],
          [
            'Small molecule',
            'Chemical scaffold\nand substitutions',
            'A pocket or ligand-\nbinding mechanism',
            'Chemistry, selectivity\nand exposure',
          ],
          [
            'Peptide /\nminibinder',
            'Sequence, fold\nand interface',
            'A molecular surface\nor interaction',
            'Stability\nand delivery',
          ],
          [
            'Antibody',
            'Framework, CDRs\nand format',
            'An accessible\nepitope',
            'Developability\nand format',
          ],
        ],
        [0.19, 0.26, 0.29, 0.26],
        [0.15, 0.28, 0.29, 0.28],
        19,
      ),
      text(
        'format-distinction',
        'VHH and scFv are antibody-derived formats, distinct from non-antibody minibinders.',
        [48, 463, 864, 36],
        18,
        {
          color: palette.muted,
        },
      ),
    ],
    'These are common starting points rather than strict boundaries. Specialized chemistry and delivery can change which sites a modality reaches. The useful distinction is what is optimized and what establishes its function. Here, minibinder means a non-antibody protein binder. VHH and scFv belong to the antibody route even when they are physically small. The comparison is an author synthesis of documented tool scopes and experimental formats.',
    ['FDA', 'RF', 'BINDCRAFT', 'RFANTIBODY'],
  ),
  page(
    4,
    'small-molecules',
    'Small-molecule design',
    'Map molecular representation, generation, structure and affinity tools to their jobs.',
    [
      text(
        'route-statement',
        'A chemical series\nconnects design\nto measurement.',
        [48, 153, 340, 160],
        36,
        {
          bold: true,
          color: palette.teal,
          lineHeight: 1.16,
        },
      ),
      text(
        'route-caption',
        'Synthesis and biological testing\nclose the loop.',
        [48, 365, 340, 82],
        23,
        {
          color: palette.muted,
        },
      ),
      line('route-divider', 413, 145, 413, 462),
      text('chemistry-title', 'Explore chemistry', [455, 146, 455, 31], 23, { bold: true }),
      text('chemistry-tools', 'RDKit and REINVENT4', [455, 185, 455, 30], 21, {
        color: palette.teal,
      }),
      text('pose-title', 'Propose binding poses', [455, 241, 455, 31], 23, { bold: true }),
      text('pose-tools', 'AutoDock Vina or AlphaFold 3', [455, 280, 455, 30], 21, {
        color: palette.teal,
      }),
      text('affinity-title', 'Prioritize affinity', [455, 336, 455, 31], 23, { bold: true }),
      text(
        'affinity-tools',
        'Boltz-2 or alchemical calculations\nwith OpenFE',
        [455, 375, 455, 64],
        21,
        { color: palette.teal },
      ),
    ],
    'RDKit provides molecular representation and cheminformatics. REINVENT4 supports molecular generation and optimization. Vina searches docking poses using a scoring function, while AlphaFold 3 predicts biomolecular complex structures. Boltz-2 provides a learned affinity output for protein–small-molecule complexes. OpenFE supports alchemical free-energy calculations. These estimates depend on the system and setup, and guide which compounds to make and measure. They do not establish biological efficacy.',
    ['RDKIT', 'REINVENT', 'VINA', 'AF3', 'BOLTZ', 'OPENFE'],
  ),
  page(
    5,
    'protein-binders',
    'Protein and minibinder design',
    'Show joint and modular design routes without implying a mandatory tool chain.',
    [
      text('joint-heading', 'Joint generation', [48, 142, 360, 30], 20, { color: palette.muted }),
      text('modular-label', 'Backbone and sequence design', [48, 272, 500, 30], 20, {
        color: palette.muted,
      }),
      ...node('joint', 'RFD4-Proteina\nsequence + structure', [48, 184, 365, 70], { fontSize: 22 }),
      ...node('backbone', 'RFdiffusion', [48, 315, 198, 66], { fontSize: 22 }),
      ...node('sequence', 'ProteinMPNN', [294, 315, 215, 66], { fontSize: 22 }),
      line('sequence-link', 253, 348, 285, 348, { arrow: true, border: { color: palette.teal } }),
      line('joint-link', 425, 219, 579, 219, { arrow: true, border: { color: palette.teal } }),
      line('modular-link', 520, 348, 579, 348, { arrow: true, border: { color: palette.teal } }),
      ...node('selection', 'Complex prediction\nand candidate selection', [590, 184, 322, 197], {
        fill: palette.ink,
        color: palette.white,
        fontSize: 25,
      }),
      text(
        'integrated-route',
        'BindCraft integrates design and filtering in an experimentally evaluated binder workflow.',
        [48, 416, 864, 62],
        21,
        {
          color: palette.muted,
        },
      ),
    ],
    'Protein design has both modular and integrated approaches. RFdiffusion established generative backbone design, with ProteinMPNN commonly used for sequence design. The current RFD4-Proteina release supports joint sequence–structure generation. BindCraft is an experimentally evaluated automated workflow for de novo binders. These are alternative routes with overlapping capabilities. Structural assessment and physical plausibility inform selection. Expression, specificity and the intended biological effect still need measurement.',
    ['RF', 'MPNN', 'RFD4', 'BINDCRAFT', 'AF3'],
  ),
  page(
    6,
    'antibodies',
    'Antibody design',
    'Explain the framework, CDR and format problem and distinguish design from developability.',
    [
      text('framework-heading', 'Framework', [48, 150, 265, 38], 30, {
        bold: true,
        color: palette.teal,
      }),
      text(
        'framework-copy',
        'A structural context\nfor the binding loops.',
        [48, 208, 255, 78],
        24,
      ),
      line('framework-cdr', 303, 224, 350, 224, { arrow: true, border: { color: palette.teal } }),
      text('cdr-heading', 'CDRs', [369, 150, 253, 38], 30, { bold: true, color: palette.teal }),
      text('cdr-copy', 'Binding geometry\nat a chosen epitope.', [369, 208, 253, 78], 24),
      line('cdr-format', 626, 224, 671, 224, { arrow: true, border: { color: palette.teal } }),
      text('format-heading', 'Format', [692, 150, 220, 38], 30, {
        bold: true,
        color: palette.teal,
      }),
      text('format-copy', 'VHH, scFv, Fab\nor full antibody.', [692, 208, 220, 78], 24),
      line('antibody-rule', 48, 323, 912, 323),
      text('design-tools', 'RFantibody and RFD4-Proteina', [48, 354, 515, 36], 25, { bold: true }),
      text('design-tools-copy', 'Epitope-directed design or CDR design.', [48, 402, 515, 66], 21, {
        color: palette.muted,
      }),
      text('profile-title', 'TAP', [625, 354, 287, 36], 25, { bold: true }),
      text('profile-copy', 'Calculated developability flags.', [625, 402, 287, 66], 21, {
        color: palette.muted,
      }),
    ],
    'Antibody design focuses on binding loops within a framework and a chosen molecular format. RFantibody combines computational design with experimental screening and characterization. RFD4-Proteina documents antibody CDR design as a supported task. TAP flags unusual calculated properties relative to clinical-stage antibodies, providing an early developability screen. Affinity optimization, format choice and functional evaluation continue after the first binder. The diagram is conceptual and does not depict a molecular structure or an experimental result.',
    ['RFANTIBODY', 'RFD4', 'TAP'],
  ),
  page(
    7,
    'tool-map',
    'A tool map by decision',
    'Make the output and purpose of each tool family explicit.',
    [
      table(
        'decision-tools',
        [48, 137, 864, 327],
        [
          ['Decision', 'Representative tools', 'Main output'],
          [
            'What to propose?',
            'REINVENT4, RFD4-Proteina,\nRFdiffusion, BindCraft',
            'Candidate molecules',
          ],
          ['Which sequence?', 'ProteinMPNN', 'Designed sequences'],
          ['Which complex?', 'AlphaFold 3, Boltz-2, Vina', 'Poses and assessment'],
          ['Which affinity change?', 'Boltz-2, OpenFE', 'Context-dependent estimates'],
          ['Which liabilities?', 'RDKit descriptors, TAP', 'Property flags'],
        ],
        [0.27, 0.43, 0.3],
        [0.12, 0.22, 0.16, 0.17, 0.17, 0.16],
        18,
      ),
      text(
        'map-note',
        'Tool roles overlap. Each output supports a different decision.',
        [48, 479, 780, 24],
        17,
        { color: palette.muted },
      ),
    ],
    "A generator proposes molecules. A structure model evaluates or proposes conformations. Docking scores, learned affinity estimates and alchemical free energies have different meanings and assumptions. Boltz-2's standard affinity output concerns protein–small-molecule binding. It is not a validated universal protein–protein affinity estimator. Property flags identify concerns that need further evaluation. This table is an author synthesis of the documented roles of representative tools.",
    [
      'REINVENT',
      'RF',
      'RFD4',
      'BINDCRAFT',
      'MPNN',
      'AF3',
      'BOLTZ',
      'VINA',
      'OPENFE',
      'RDKIT',
      'TAP',
    ],
  ),
  page(
    8,
    'evidence',
    'What the evidence establishes',
    'Separate confidence in predicted geometry, measured binding, function and development.',
    [
      table(
        'evidence-table',
        [48, 137, 864, 319],
        [
          ['Readout', 'What it can support', 'What still needs evidence'],
          [
            'pLDDT, PAE,\nipTM / ipSAE',
            'Confidence in a predicted\nfold or interface',
            'Affinity and biological effect',
          ],
          [
            'Binding and kinetics',
            'Target engagement under\nthe assay conditions',
            'Desired biological function',
          ],
          ['Functional activity', 'A defined\nbiological response', 'Exposure and tolerability'],
          [
            'Stability, exposure\nand safety data',
            'Feasibility of\nfurther development',
            'Benefit in the intended setting',
          ],
        ],
        [0.25, 0.36, 0.39],
        [0.12, 0.23, 0.22, 0.21, 0.22],
        19,
      ),
      text(
        'evidence-conclusion',
        'The strength of the conclusion must follow the kind of evidence.',
        [48, 475, 810, 28],
        20,
        {
          color: palette.teal,
          bold: true,
        },
      ),
    ],
    'Confidence metrics describe aspects of a predicted structure. ipSAE derives interface confidence from predicted aligned errors rather than measuring binding free energy. Binding and kinetic measurements establish interaction under stated conditions. Functional readouts address the intended biological effect. Further development needs exposure, stability and safety evidence, followed by clinical evaluation. Evidence usually grows iteratively. Each row separates the claim directly supported by a readout from the next question.',
    ['AF3', 'IPSAE', 'FDA', 'FDA-PROCESS'],
  ),
  page(
    9,
    'candidate-selection',
    'Candidate selection',
    'Present an explicit decision framework without fabricated scoring data.',
    [
      text('biology-input', 'Biology', [48, 151, 286, 38], 29, { bold: true, color: palette.teal }),
      text('biology-detail', 'Mechanism and function', [48, 201, 310, 31], 21, {
        color: palette.muted,
      }),
      text('molecule-input', 'Molecular evidence', [48, 273, 330, 38], 29, {
        bold: true,
        color: palette.teal,
      }),
      text('molecule-detail', 'Binding and structural plausibility', [48, 323, 350, 31], 21, {
        color: palette.muted,
      }),
      text('feasibility-input', 'Feasibility', [48, 395, 286, 38], 29, {
        bold: true,
        color: palette.teal,
      }),
      text('feasibility-detail', 'Stability, exposure and production', [48, 445, 350, 31], 21, {
        color: palette.muted,
      }),
      line('selection-divider', 437, 151, 437, 474),
      text('decision', 'Which result\nwould change\nthe decision?', [487, 158, 425, 180], 42, {
        bold: true,
        lineHeight: 1.15,
      }),
      text(
        'selection-copy',
        'Keep evidence types inspectable.\nRetain useful molecular diversity.\nResolve the largest uncertainty next.',
        [487, 374, 425, 110],
        22,
        {
          color: palette.muted,
          lineHeight: 1.35,
        },
      ),
    ],
    'This is a proposed decision framework, not an empirical benchmark. A shortlist depends on the biological question, experimental capacity and the failures that would stop development. Candidates should be compared within relevant molecular classes, with distinct evidence types kept visible. A useful next measurement can distinguish competing explanations or change the selected candidate. Molecular diversity helps avoid committing the whole study to one untested assumption.',
    ['FDA', 'BINDCRAFT', 'RFANTIBODY', 'TAP'],
  ),
  page(
    10,
    'first-study',
    'A useful first study',
    'Close with a practical research programme and the decision it should support.',
    [
      text(
        'closing-title',
        'A reasoned choice\nof which molecule\nto develop.',
        [48, 153, 443, 255],
        43,
        {
          bold: true,
          color: palette.teal,
          lineHeight: 1.13,
        },
      ),
      line('closing-divider', 527, 150, 527, 459),
      text('study-one', '01', [568, 153, 42, 32], 22, { color: palette.orange, bold: true }),
      text(
        'study-one-copy',
        'State the mechanism\nand required properties.',
        [628, 151, 284, 64],
        23,
      ),
      text('study-two', '02', [568, 238, 42, 32], 22, { color: palette.orange, bold: true }),
      text(
        'study-two-copy',
        'Choose a design route\nand a clear baseline.',
        [628, 236, 284, 64],
        23,
      ),
      text('study-three', '03', [568, 323, 42, 32], 22, { color: palette.orange, bold: true }),
      text(
        'study-three-copy',
        'Build a diverse shortlist.\nCombine evidence.',
        [628, 321, 284, 70],
        23,
      ),
      text('study-four', '04', [568, 412, 42, 32], 22, { color: palette.orange, bold: true }),
      text('study-four-copy', 'Measure binding.\nTest function. Iterate.', [628, 410, 284, 70], 23),
    ],
    'A first study should deliver an inspectable choice of candidates and a plan for the evidence that comes next. Record model versions, molecular identities, assumptions and measured outcomes. For protein binders, a clear interaction is a useful initial goal. Therapeutic usefulness also depends on mechanism, delivery and developability. The same decision logic applies to small molecules and antibodies. This closing study plan is an author synthesis, not a prescribed experimental protocol.',
    ['FDA', 'FDA-PROCESS'],
  ),
];

const story = (purpose, takeaway) => ({
  purpose,
  audience: 'Computational molecular-design research group',
  takeaway,
});
const sections = [
  {
    id: 'design-brief',
    title: 'Design brief',
    pageIds: slides.slice(0, 3).map((slide) => slide.id),
    range: { startPageId: slides[0].id, endPageId: slides[2].id },
    story: story(
      'Define a useful candidate and compare molecular formats.',
      'The biological mechanism and required properties determine the design route.',
    ),
  },
  {
    id: 'design-routes',
    title: 'Design routes',
    pageIds: slides.slice(3, 6).map((slide) => slide.id),
    range: { startPageId: slides[3].id, endPageId: slides[5].id },
    story: story(
      'Explain the small-molecule, minibinder and antibody toolchains.',
      'Tools differ in the objects and constraints they optimize.',
    ),
  },
  {
    id: 'evidence-decisions',
    title: 'Evidence and decisions',
    pageIds: slides.slice(6).map((slide) => slide.id),
    range: { startPageId: slides[6].id, endPageId: slides[9].id },
    story: story(
      'Connect computational outputs to scientific decisions.',
      'Measured function and development evidence determine progression.',
    ),
  },
];
const metadata = {
  schemaVersion: 1,
  deckId: 'd0100000-0000-4000-8000-000000000000',
  entry: 'deck.pptd',
  designPolicy: 'huandeng-human-scientific-v1',
  slides: Object.fromEntries(
    slides.map((slide, index) => [
      slide.id,
      {
        shortCode: slide.code,
        label: `S${index + 1}`,
        path: slide.path,
        state: 'active',
        designIntent: {
          purpose: slide.purpose,
          keep: [
            'Preserve the authored 960 × 540 composition and intentional whitespace.',
            'Keep text, tables and process diagrams editable.',
            'Keep claim-specific sources in speaker notes.',
          ],
        },
        elementRoles: Object.fromEntries(
          slide.data.elements.map((element) => [
            element.elementId,
            element.elementId === 'title'
              ? 'title'
              : element.elementType === 'table'
                ? 'evidence'
                : element.elementId === 'slide-id'
                  ? 'identity'
                  : 'explanation',
          ]),
        ),
        components: {},
        lastAuthorReview: null,
      },
    ]),
  ),
  project: {
    schemaVersion: 1,
    mainStory: story(
      'Explain design routes and the evidence needed for a useful drug candidate.',
      'Candidate generation, predicted binding, measured activity and developability answer different questions.',
    ),
    sections,
    presentations: [
      {
        id: 'drug-design-overview',
        title: 'Drug Design · Full overview',
        story: story(
          'Present the full 10-slide argument in 8–12 minutes.',
          'A useful programme connects molecular design to evidence for a biological mechanism.',
        ),
        items: sections.map((section) => ({
          id: `full-${section.id}`,
          kind: 'section',
          sectionId: section.id,
        })),
        notes:
          'A 10-slide Presentation that dynamically references the three contiguous Main Slides Sections.',
      },
      {
        id: 'drug-design-briefing',
        title: 'Drug Design · Five-slide briefing',
        story: story(
          'Give a five-minute introduction for a mixed audience.',
          'Choose the molecular route, then ask what each kind of evidence establishes.',
        ),
        items: [1, 3, 7, 8, 10].map((position) => ({
          id: `brief-${slides[position - 1].code.toLowerCase()}`,
          kind: 'page',
          pageId: slides[position - 1].id,
        })),
        notes:
          'Reuses five canonical Main Slides by stable ID without copying their visual content.',
      },
    ],
  },
};

for (const slide of slides) {
  assert.ok(slide.data.notes.includes('Sources'));
  const ids = new Set();
  for (const element of slide.data.elements) {
    assert.ok(!ids.has(element.elementId), `Duplicate element ID in ${slide.path}`);
    ids.add(element.elementId);
    const [x, y, width, height] = element.bounds;
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0);
    assert.ok(
      x + width <= 960 && y + height <= 540,
      `Outside canvas: ${slide.path}/${element.elementId}`,
    );
  }
}

try {
  await fs.access(path.join(output, 'deck.pptd'));
  if (!replace)
    throw new Error(
      `Project exists at ${output}. Choose a new directory or pass --replace to regenerate it.`,
    );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await fs.mkdir(path.join(output, 'pages'), { recursive: true });
await fs.mkdir(path.join(output, '.huandeng'), { recursive: true });
for (const slide of slides) {
  await fs.writeFile(path.join(output, slide.path), `${JSON.stringify(slide.data, null, 2)}\n`);
}
await fs.writeFile(
  path.join(output, 'deck.pptd'),
  `${JSON.stringify(
    {
      title: 'Drug Design · How a designed molecule becomes a useful candidate',
      size: [960, 540],
      pages: slides.map((slide) => slide.path),
      theme: { fontFamily: 'Arial', colors: palette },
    },
    null,
    2,
  )}\n`,
);
await fs.writeFile(
  path.join(output, '.huandeng/project.json'),
  `${JSON.stringify(metadata, null, 2)}\n`,
);
const bibliography = references
  .map(
    (source) =>
      `### ${source.id}\n\n${source.title}\n\n${source.url}${source.alternate ? `\n\n${source.alternate}` : ''}\n\nScope: ${source.scope}`,
  )
  .join('\n\n');
await fs.writeFile(
  path.join(output, 'SOURCES.md'),
  `# Drug Design sources\n\nChecked 8 November 2026. Primary publications and official model documentation. Tool roles are representative rather than exhaustive.\n\n${bibliography}\n`,
);
await fs.writeFile(
  path.join(output, 'README.md'),
  '# Drug Design\n\nOpen `deck.pptd` in HUANDENG. The project contains ten editable Main Slides and three contiguous Sections.\n\nSelect **Drug Design · Full overview** for the full Presentation or **Drug Design · Five-slide briefing** for a shorter selection. Both reference the same canonical pages.\n\nEach slide has speaker notes and primary-source citations. `SOURCES.md` contains the bibliography. Text, tables and process diagrams are native editable objects. The diagrams are conceptual rather than molecular structures or experimental results.\n\nTo generate a fresh copy from the repository, run `node scripts/create-drug-design-v010.mjs <new-directory>`. The generator refuses to overwrite an existing deck unless `--replace` is supplied.\n',
);
const contentDocument = `# Drug Design — v0.10 content and design plan\n\nChecked 8 November 2026 (Australia/Sydney).\n\n## Main Story\n\nPurpose: ${metadata.project.mainStory.purpose}\n\nTakeaway: ${metadata.project.mainStory.takeaway}\n\nAudience: ${metadata.project.mainStory.audience}. Approximately 8–12 minutes.\n\n## Composition\n\nTen authored 960 × 540 canvases. Arial, ivory, navy and teal. Native text, tables and exact process diagrams remain editable. No invented performance numbers, generated molecular structures or decorative stock pictures. Slide-specific scientific purpose determines the layout.\n\n## Organisation\n\nThree contiguous Sections cover slides 1–3, 4–6 and 7–10. A full Presentation references these Sections. A shorter Presentation references slides 1, 3, 7, 8 and 10 by stable ID. Visual review is recorded separately after rendering.\n\n## Content\n\n${slides
  .map(
    (slide, index) =>
      `### ${index + 1}. ${slide.title}\n\nPurpose: ${slide.purpose}\n\n${slide.narration}\n\nSources: ${slide.sources.map((id) => `[${id}]`).join(', ')}.`,
  )
  .join(
    '\n\n',
  )}\n\n## Scientific decisions\n\n- Distinguish non-antibody minibinders from VHH and scFv.\n- Keep structural confidence, affinity, biological activity and developability as distinct claims.\n- Describe Boltz-2's standard affinity scope as protein–small-molecule binding.\n- Treat model capabilities as documented tool features rather than evidence of clinical efficacy.\n- Do not compare success percentages across incompatible studies or use a stable short MD trajectory as proof of affinity.\n- The candidate-selection and first-study slides are author synthesis, not empirical benchmarks or experimental protocols.\n\n## References\n\n${bibliography}\n`;
await fs.mkdir(path.join(root, 'docs/research'), { recursive: true });
const reviewChecklist = [
  '\n## Sources and visual review checklist',
  '',
  'Record actual outcomes in the version validation report. Capturing a slide or passing geometry checks is not author approval.',
  '',
  '- Match each factual statement to the cited primary publication or official documentation in its speaker notes.',
  '- Keep RFD4-Proteina capabilities separate from experimental validation, and Boltz-2 affinity claims within the documented small-molecule scope.',
  '- Inspect every rendered page for hierarchy, readable type, wrapping, table fit, connector placement and deliberate whitespace.',
  '- Confirm that the stable Slide ID footer remains unchanged when the five-slide Presentation reuses Main Slides.',
  '- Confirm full order DD01–DD10 and briefing order DD01, DD03, DD07, DD08, DD10.',
  '- Read source citations in Presenter notes and verify that the ten-page and five-page PDF exports match the selected collection.',
  '- Reopen the project and confirm that Main Slides, Sections and both Presentations retain their identities.',
  '',
  'Schema: `.page` and `.pptd` use JSON as valid YAML. The internal `label` alias must be an S number, while the authored slide title lives in the page content. Sections use stable boundary IDs with a pageIds compatibility cache. Stable UUIDs and display IDs are deterministic for this example.',
  '',
  'Run the isolated desktop harness with `HUANDENG_DESKTOP_EXE` set to the candidate executable, then `node scripts/verify-drug-design-v010.mjs --exports`. `HUANDENG_DESKTOP_APP` may identify an unpackaged Electron app. Omit `--exports` for UI, notes, slide screenshots and persistence checks only.',
  '',
].join('\n');
await fs.writeFile(
  path.join(root, 'docs/research/DRUG-DESIGN-V010.md'),
  contentDocument + reviewChecklist,
);
process.stdout.write(
  `${JSON.stringify({ output, slides: slides.length, sections: sections.length, presentations: metadata.project.presentations.map((presentation) => presentation.title) }, null, 2)}\n`,
);
