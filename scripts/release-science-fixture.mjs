import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function scientificReleaseSvg(core) {
  const assets = path.join(core, 'dist/editor/assets');
  const font = (await fs.readdir(assets)).find((name) =>
    /^geist-latin-wght-normal-.*\.woff2$/.test(name),
  );
  assert.ok(font, 'The packaged editor font is missing.');
  const encoded = (await fs.readFile(path.join(assets, font))).toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
<defs>
<style>@font-face{font-family:ScienceFixture;src:url(data:font/woff2;base64,${encoded}) format('woff2')}.label{font:18px ScienceFixture,Arial,sans-serif;fill:#143c5a}.axis{fill:none;stroke:#284b63;stroke-width:2}.point{fill:#108c95;stroke:white;stroke-width:2}</style>
<clipPath id="plot"><rect x="64" y="54" width="512" height="248" rx="5"/></clipPath>
<linearGradient id="fade"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
<mask id="mask"><rect x="64" y="54" width="512" height="248" fill="url(#fade)"/></mask>
<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/><feOffset dx="4" dy="4"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="640" height="360" fill="#f8fafc"/><text class="label" x="64" y="30">Synthetic scientific measurements</text>
<path class="axis" d="M64 50V302H590"/><g clip-path="url(#plot)">
<rect x="40" y="80" width="580" height="200" fill="#a3d9db" mask="url(#mask)"/>
<path d="M30 270C150 260 230 50 350 170S520 130 620 70" fill="none" stroke="#d76335" stroke-width="5" filter="url(#shadow)"/>
<g class="point"><circle cx="90" cy="254" r="8"/><circle cx="200" cy="180" r="8"/><circle cx="310" cy="152" r="8"/><circle cx="420" cy="168" r="8"/><circle cx="550" cy="117" r="8"/></g></g>
<text class="label" x="75" y="332">Condition A</text><text class="label" x="462" y="332">Condition B</text></svg>`;
}
