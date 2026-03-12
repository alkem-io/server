import { convertMarkdownToPlainText } from './markdown.to.plaintext';

describe('convertMarkdownToPlainText', () => {
  describe('empty / blank input', () => {
    it.each([
      { input: '', label: 'empty string' },
      { input: '   ', label: 'whitespace-only string' },
      { input: '\n\n', label: 'newlines-only string' },
      { input: '\t \n', label: 'mixed whitespace' },
    ])('returns empty string for $label', ({ input }) => {
      expect(convertMarkdownToPlainText(input)).toBe('');
    });
  });

  describe('plain text passthrough', () => {
    it('returns the same text when there is no markdown', () => {
      expect(convertMarkdownToPlainText('Hello world')).toBe('Hello world');
    });

    it('trims leading and trailing whitespace', () => {
      expect(convertMarkdownToPlainText('  hello  ')).toBe('hello');
    });
  });

  describe('inline formatting', () => {
    it.each([
      { md: '**bold**', expected: 'bold', label: 'bold' },
      { md: '*italic*', expected: 'italic', label: 'italic' },
      {
        md: '~~strikethrough~~',
        expected: 'strikethrough',
        label: 'strikethrough',
      },
      { md: '`inline code`', expected: 'inline code', label: 'inline code' },
      {
        md: 'Use **bold** and *italic* together',
        expected: 'Use bold and italic together',
        label: 'mixed bold + italic',
      },
    ])('strips $label markers', ({ md, expected }) => {
      expect(convertMarkdownToPlainText(md)).toBe(expected);
    });
  });

  describe('headings', () => {
    it.each([
      { md: '# Heading 1', expected: 'Heading 1' },
      { md: '## Heading 2', expected: 'Heading 2' },
      { md: '### Heading 3', expected: 'Heading 3' },
    ])('extracts text from "$md"', ({ md, expected }) => {
      expect(convertMarkdownToPlainText(md)).toBe(expected);
    });
  });

  describe('links and images', () => {
    it('extracts link text and discards the URL', () => {
      expect(convertMarkdownToPlainText('[Alkemio](https://alkem.io)')).toBe(
        'Alkemio'
      );
    });

    it('strips image markdown without leaving syntax artifacts', () => {
      // Images render as <img> tags; textContent does not include the alt attr,
      // so the result is empty — verify no markdown syntax leaks through.
      const result = convertMarkdownToPlainText(
        '![Logo](https://example.com/logo.png)'
      );
      expect(result).not.toContain('![');
      expect(result).not.toContain('](');
    });

    it('handles auto-links', () => {
      expect(convertMarkdownToPlainText('<https://alkem.io>')).toBe(
        'https://alkem.io'
      );
    });
  });

  describe('lists', () => {
    it('extracts text from unordered list items', () => {
      const md = `- Item one\n- Item two\n- Item three`;
      const result = convertMarkdownToPlainText(md);

      expect(result).toContain('Item one');
      expect(result).toContain('Item two');
      expect(result).toContain('Item three');
    });

    it('extracts text from ordered list items', () => {
      const md = `1. First\n2. Second\n3. Third`;
      const result = convertMarkdownToPlainText(md);

      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('Third');
    });
  });

  describe('code blocks', () => {
    it('strips fenced code blocks, preserving code text', () => {
      const md = '```typescript\nconst x = 1;\n```';
      const result = convertMarkdownToPlainText(md);
      expect(result).toContain('const x = 1;');
      expect(result).not.toContain('```');
    });
  });

  describe('blockquotes', () => {
    it('extracts text from blockquotes', () => {
      const md = '> This is a quote';
      expect(convertMarkdownToPlainText(md)).toBe('This is a quote');
    });
  });

  describe('inline HTML handling', () => {
    it('strips inline <br> tags instead of rendering them as text', () => {
      const md = 'Line one<br>Line two';
      const result = convertMarkdownToPlainText(md);
      expect(result).not.toContain('<br>');
      expect(result).not.toContain('&lt;');
      expect(result).toContain('Line one');
      expect(result).toContain('Line two');
    });

    it('strips inline <strong> tags', () => {
      const md = 'This is <strong>important</strong>';
      const result = convertMarkdownToPlainText(md);
      expect(result).toBe('This is important');
    });

    it('strips <a> tags and keeps link text', () => {
      const md = 'Visit <a href="https://example.com">Example</a> now';
      expect(convertMarkdownToPlainText(md)).toBe('Visit Example now');
    });
  });

  describe('whitespace normalization', () => {
    it('collapses multiple blank lines into single newline', () => {
      const md = 'Paragraph one\n\n\n\nParagraph two';
      const result = convertMarkdownToPlainText(md);
      // Multiple newlines should be collapsed
      expect(result).not.toMatch(/\n\s*\n/);
      expect(result).toContain('Paragraph one');
      expect(result).toContain('Paragraph two');
    });

    it('trims output', () => {
      const md = '\n\n  Hello  \n\n';
      const result = convertMarkdownToPlainText(md);
      expect(result).toBe(result.trim());
    });
  });

  describe('complex / real-world content', () => {
    it('handles a full markdown document', () => {
      const md = [
        '# Event Title',
        '',
        'Join us for **an amazing** event!',
        '',
        '## Details',
        '',
        '- Date: 2026-03-05',
        '- Location: [Alkemio HQ](https://alkem.io)',
        '',
        '> Bring your ideas.',
        '',
        '```',
        'register()',
        '```',
      ].join('\n');

      const result = convertMarkdownToPlainText(md);

      expect(result).toContain('Event Title');
      expect(result).toContain('Join us for an amazing event!');
      expect(result).toContain('Date: 2026-03-05');
      expect(result).toContain('Alkemio HQ');
      expect(result).not.toContain('https://alkem.io');
      expect(result).toContain('Bring your ideas.');
      expect(result).toContain('register()');
      // No leftover markdown syntax
      expect(result).not.toMatch(/[#*`>[\]]/);
    });

    it('handles markdown with HTML entities', () => {
      const md = 'Tom &amp; Jerry &lt;3';
      const result = convertMarkdownToPlainText(md);
      expect(result).toContain('Tom & Jerry');
      expect(result).toContain('<3');
    });

    it('handles horizontal rules without leaving artifacts', () => {
      const md = 'Above\n\n---\n\nBelow';
      const result = convertMarkdownToPlainText(md);
      expect(result).toContain('Above');
      expect(result).toContain('Below');
      expect(result).not.toContain('---');
    });
  });

  describe('security', () => {
    it('does not execute script tags in the markdown', () => {
      const md = '<script>throw new Error("xss")</script>Safe text';
      // Should not throw, and script content should be stripped or inert
      const result = convertMarkdownToPlainText(md);
      expect(result).toContain('Safe text');
      expect(result).not.toContain('throw new Error("xss")');
    });

    it('strips event handlers from HTML attributes', () => {
      const md = '<div onload="alert(1)">Content</div>';
      const result = convertMarkdownToPlainText(md);
      expect(result).toBe('Content');
      expect(result).not.toContain('onload');
    });
  });
});
