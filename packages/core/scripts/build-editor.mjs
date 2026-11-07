import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const core = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(core, 'src/app');
const output = path.join(core, 'dist/editor');
const configModule = '\0huandeng:config';

await build({
  root: app,
  configFile: false,
  publicDir: false,
  base: '/',
  plugins: [
    {
      name: 'huandeng:editor-config',
      resolveId(id) {
        return id === 'virtual:open-slide/config' ? configModule : null;
      },
      load(id) {
        if (id !== configModule) return null;
        return `import { zhCN } from ${JSON.stringify(path.join(core, 'src/locale/zh-cn.ts').replaceAll('\\', '/'))}; export default { locale: zhCN, agent: { enabled: false }, build: { showSlideBrowser: false } };`;
      },
    },
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { '@': app }, dedupe: ['react', 'react-dom'] },
  build: {
    outDir: output,
    emptyOutDir: true,
    target: 'chrome140',
    rolldownOptions: { input: path.join(app, 'huandeng.html') },
    chunkSizeWarningLimit: 2000,
  },
});
await fs.access(path.join(output, 'huandeng.html'));
process.stdout.write(`HUANDENG production editor: ${output}\n`);
