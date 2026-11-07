import fs from 'node:fs/promises';
import path from 'node:path';
import type { DeckSnapshot } from './types.ts';

export interface ProjectTreeNode {
  path: string;
  name: string;
  kind: 'file' | 'directory';
  role: 'manifest' | 'page' | 'media' | 'metadata' | 'export' | 'other';
  pageId?: string;
  children?: ProjectTreeNode[];
}

export async function readProjectTree(root: string, snapshot: DeckSnapshot) {
  const pages = new Map(
    Object.entries(snapshot.metadata.slides).map(([id, slide]) => [slide.path, id]),
  );
  const ignored = new Set(['node_modules', '.git', '.cache', '.verification', 'dist', 'build']);
  let remaining = 3000;
  let truncated = false;
  const walk = async (relative: string, depth: number): Promise<ProjectTreeNode[]> => {
    const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
    entries.sort(
      (a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name),
    );
    const nodes: ProjectTreeNode[] = [];
    for (const entry of entries) {
      if (
        ignored.has(entry.name) ||
        (entry.name.startsWith('.') && entry.name !== '.huandeng') ||
        entry.isSymbolicLink()
      )
        continue;
      if (remaining-- <= 0) {
        truncated = true;
        break;
      }
      const file = relative ? `${relative}/${entry.name}` : entry.name;
      const pageId = pages.get(file);
      const role: ProjectTreeNode['role'] =
        file === snapshot.entry
          ? 'manifest'
          : pageId
            ? 'page'
            : /^\.huandeng(?:\/|$)/.test(file)
              ? 'metadata'
              : /^(media|assets)(?:\/|$)/i.test(file)
                ? 'media'
                : /^exports(?:\/|$)/i.test(file)
                  ? 'export'
                  : 'other';
      const node: ProjectTreeNode = {
        path: file,
        name: entry.name,
        kind: entry.isDirectory() ? 'directory' : 'file',
        role,
        ...(pageId ? { pageId } : {}),
      };
      if (entry.isDirectory()) {
        if (depth < 6) node.children = await walk(file, depth + 1);
        else truncated = true;
      }
      nodes.push(node);
    }
    return nodes;
  };
  const nodes = await walk('', 0);
  return { entry: path.join(root, snapshot.entry), root, nodes, truncated };
}
