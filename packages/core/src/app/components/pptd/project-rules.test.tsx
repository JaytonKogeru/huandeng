import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ProjectAuthoringGuidance } from '../../../pptd/types';
import { ProjectRules } from './project-rules';

const guidance = (overrides: Partial<ProjectAuthoringGuidance> = {}): ProjectAuthoringGuidance => ({
  sourcePath: 'AGENTS.md',
  role: 'authoring-context',
  status: 'available',
  revision: 'sha256:rules',
  text: '# Project rules\n\nPreserve the original figure.',
  truncated: false,
  byteLength: 48,
  limits: { maxBytes: 65536, maxCharacters: 12000 },
  ...overrides,
});

const render = (value?: ProjectAuthoringGuidance) =>
  renderToStaticMarkup(
    <ProjectRules guidance={value} onOpenFile={() => {}} onRefresh={() => {}} />,
  );

describe('ProjectRules', () => {
  it('shows the canonical text literally without interpreting HTML or commands', () => {
    const html = render(
      guidance({ text: '# User rules\n<script>not executable</script>\n**Keep this wording**' }),
    );
    expect(html).toContain('# User rules\n&lt;script&gt;not executable&lt;/script&gt;');
    expect(html).toContain('**Keep this wording**');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Source: AGENTS.md at the Project root');
    expect(html).toContain('Open AGENTS.md');
  });

  it('identifies a truncated excerpt without presenting it as the full file', () => {
    const html = render(guidance({ text: 'Only the beginning', truncated: true }));
    expect(html).toContain('Only the beginning');
    expect(html).toContain('Only part of AGENTS.md is shown here.');
    expect(html).toContain('data-hd-open-project-rules');
  });

  it('distinguishes missing guidance from an empty available file', () => {
    const missing = render(guidance({ status: 'missing', text: '', revision: null }));
    expect(missing).toContain('No AGENTS.md was found at the Project root.');
    expect(missing).toContain('disabled=""');
    expect(missing).not.toContain('data-hd-project-rules-text');
    const empty = render(guidance({ text: '' }));
    expect(empty).toContain('AGENTS.md is empty.');
    expect(empty).not.toContain('disabled=""');
  });

  it('shows an unreadable reason without exposing unaccepted content', () => {
    const html = render(
      guidance({
        status: 'unavailable',
        reason: 'linked-file',
        revision: null,
        text: 'Do not display this unaccepted content',
      }),
    );
    expect(html).toContain('Linked AGENTS.md files are not read.');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('Do not display this unaccepted content');
  });

  it('does not describe an older snapshot without guidance as a missing file', () => {
    const html = render();
    expect(html).toContain('Project rules are unavailable in the current snapshot.');
    expect(html).not.toContain('No AGENTS.md was found');
  });
});
