import { yXmlFragmentToProseMirrorRootNode } from '@tiptap/y-tiptap';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import * as Y from 'yjs';
import { markdownSchema } from './markdown.schema';
import { markdownToYjsV2State } from './markdown.to.yjs.v2.state';
import { yjsStateToMarkdown } from './yjs.state.to.markdown';

// Decode a forward-converted Yjs state back to a ProseMirror doc (no reverse
// markdown serialization involved) so a test can assert exactly what the forward
// converter stored on a node's attrs.
const decodeForward = (markdown: string): ProseMirrorNode => {
  const state = markdownToYjsV2State(markdown);
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, new Uint8Array(state));
  return yXmlFragmentToProseMirrorRootNode(
    doc.getXmlFragment('default'),
    markdownSchema
  );
};

const firstNodeOfType = (
  doc: ProseMirrorNode,
  typeName: string
): ProseMirrorNode | undefined => {
  let found: ProseMirrorNode | undefined;
  doc.descendants(node => {
    if (!found && node.type.name === typeName) found = node;
  });
  return found;
};

describe('yjsStateToMarkdown', () => {
  // Helper: convert markdown -> yjs state -> markdown to verify round-trip
  const roundTrip = (markdown: string): string => {
    const state = markdownToYjsV2State(markdown);
    return yjsStateToMarkdown(Buffer.from(state));
  };

  it('destroys its internal scratch Y.Doc (no per-call leak — regression)', () => {
    // Build the state BEFORE spying so only the helper's own doc.destroy() is counted.
    const state = Buffer.from(markdownToYjsV2State('leak check'));
    const destroySpy = vi.spyOn(Y.Doc.prototype, 'destroy');
    try {
      yjsStateToMarkdown(state);
      // The scratch doc created inside the helper MUST be destroyed (try/finally),
      // else every per-row verifier / read-path call leaks one Y.Doc.
      expect(destroySpy).toHaveBeenCalled();
    } finally {
      destroySpy.mockRestore();
    }
  });

  it('destroys its internal scratch Y.Doc even when decode THROWS (regression)', () => {
    const destroySpy = vi.spyOn(Y.Doc.prototype, 'destroy');
    try {
      // Demonstrably invalid update bytes → applyUpdateV2 throws inside the try; the
      // finally must still free the scratch doc rather than leak it on the error path.
      expect(() =>
        yjsStateToMarkdown(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]))
      ).toThrow();
      expect(destroySpy).toHaveBeenCalled();
    } finally {
      destroySpy.mockRestore();
    }
  });

  describe('basic text', () => {
    it('should convert simple paragraph text', () => {
      const result = roundTrip('Hello world');

      expect(result).toContain('Hello world');
    });

    it('should handle empty content', () => {
      const result = roundTrip('');

      expect(typeof result).toBe('string');
    });

    it('should preserve bold text', () => {
      const result = roundTrip('**bold text**');

      expect(result).toContain('**bold text**');
    });

    it('should preserve italic text', () => {
      const result = roundTrip('*italic text*');

      // TipTap renders italic with underscores
      expect(result).toContain('_italic text_');
    });

    it('should preserve inline code', () => {
      const result = roundTrip('Some `inline code` here');

      expect(result).toContain('`inline code`');
    });
  });

  describe('headings', () => {
    it('should preserve heading level 1', () => {
      const result = roundTrip('# Heading 1');

      expect(result).toContain('# Heading 1');
    });

    it('should preserve heading level 2', () => {
      const result = roundTrip('## Heading 2');

      expect(result).toContain('## Heading 2');
    });

    it('should preserve heading level 3', () => {
      const result = roundTrip('### Heading 3');

      expect(result).toContain('### Heading 3');
    });
  });

  describe('lists', () => {
    it('should handle bullet lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const result = roundTrip(markdown);

      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
      expect(result).toContain('- Item 3');
    });

    it('should handle ordered lists', () => {
      const markdown = '1. First\n1. Second\n1. Third';
      const result = roundTrip(markdown);

      expect(result).toContain('1.');
      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('Third');
    });

    it('should handle nested bullet lists', () => {
      const markdown = '- Parent\n  - Child\n  - Child 2';
      const result = roundTrip(markdown);

      expect(result).toContain('Parent');
      expect(result).toContain('Child');
    });

    it('should handle nested ordered lists', () => {
      const markdown = '1. Parent\n    1. Child';
      const result = roundTrip(markdown);

      expect(result).toContain('Parent');
      expect(result).toContain('Child');
    });
  });

  describe('blockquotes', () => {
    it('should preserve blockquotes', () => {
      const result = roundTrip('> A quote');

      expect(result).toContain('> A quote');
    });
  });

  describe('code blocks', () => {
    it('should preserve fenced code blocks', () => {
      const markdown = '```\ncode here\n```';
      const result = roundTrip(markdown);

      expect(result).toContain('code here');
    });
  });

  describe('horizontal rules', () => {
    it('should preserve horizontal rules', () => {
      const markdown = 'Before\n\n---\n\nAfter';
      const result = roundTrip(markdown);

      expect(result).toContain('---');
    });
  });

  describe('links', () => {
    it('should preserve links', () => {
      const result = roundTrip('[Click here](https://example.com)');

      expect(result).toContain('[Click here]');
      expect(result).toContain('https://example.com');
    });
  });

  describe('tables', () => {
    it('should handle simple tables', () => {
      const markdown = '| A | B |\n| ---- | ---- |\n| 1 | 2 |';
      const result = roundTrip(markdown);

      expect(result).toContain('|');
      expect(result).toContain('A');
      expect(result).toContain('B');
    });
  });

  describe('multiple paragraphs', () => {
    it('should preserve multiple paragraphs', () => {
      const markdown = 'First paragraph\n\nSecond paragraph';
      const result = roundTrip(markdown);

      expect(result).toContain('First paragraph');
      expect(result).toContain('Second paragraph');
    });
  });

  describe('images', () => {
    it('should preserve image URL and alt text through a round-trip', () => {
      const result = roundTrip('![alt text](https://example.com/img.png)');

      // Exact preservation — no tolerated loss. The forward converter reads the alt
      // from the image token's children via renderInlineAsText (attrGet('alt') is an
      // empty placeholder), so the reverse renderToMarkdown can re-emit it.
      expect(result).toContain('![alt text](https://example.com/img.png)');
    });

    it('forward converter stores src, alt and title on the image node', () => {
      const image = firstNodeOfType(
        decodeForward('![alt text](https://example.com/img.png "a title")'),
        'image'
      );

      expect(image).toBeDefined();
      expect(image?.attrs.src).toBe('https://example.com/img.png');
      expect(image?.attrs.alt).toBe('alt text');
      expect(image?.attrs.title).toBe('a title');
    });

    it('stores CommonMark plain-text alt with markup stripped (not raw markers)', () => {
      // CommonMark alt is plain text: emphasis markers are dropped, the text kept.
      const image = firstNodeOfType(
        decodeForward('![*em* text](https://example.com/img.png)'),
        'image'
      );

      expect(image?.attrs.alt).toBe('em text');
    });
  });
});
