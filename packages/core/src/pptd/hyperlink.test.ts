import { describe, expect, it } from 'vitest';
import { safeHyperlink } from './hyperlink';

describe('safe document hyperlinks', () => {
  it.each([
    ['HTTPS://Example.org/source?a=1&b=2#readme', 'https://example.org/source?a=1&b=2#readme'],
    ['http://example.org', 'http://example.org/'],
    ['https://example.org/file%20name', 'https://example.org/file%20name'],
    ['https://example.org/资料', 'https://example.org/%E8%B5%84%E6%96%99'],
    [
      'mailto:team@example.org?subject=Slide%20reference',
      'mailto:team@example.org?subject=Slide%20reference',
    ],
  ])('keeps an absolute document destination: %s', (input, output) => {
    expect(safeHyperlink(input)).toBe(output);
  });

  it.each([
    undefined,
    null,
    42,
    '',
    'https://',
    '/local',
    '//example.org',
    'https:example.org',
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///C:/secret',
    'ftp://example.org',
    ' https://example.org',
    'https://example.org/a b',
    'https://user:pass@example.org',
    'https://user%40name@example.org',
    'https://example.org/%0aheader',
    'https://example.org/%5cpath',
    'https://example.org/%ZZ',
    'mailto:',
    'mailto:team@example.org?body=hello%0D%0Aextra',
    'java\tscript:alert(1)',
    'https://example.org/\npath',
    'https://example.org/\\path',
  ])('removes unsafe or malformed destinations: %s', (input) => {
    expect(safeHyperlink(input)).toBeNull();
  });
});
