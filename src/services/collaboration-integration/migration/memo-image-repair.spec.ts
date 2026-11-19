import {
  markdownToYjsV2State,
  yjsStateToMarkdown,
} from '@domain/common/memo/conversion';
import { markdownSchema } from '@domain/common/memo/conversion/markdown.schema';
import { prosemirrorToYDoc } from '@tiptap/y-tiptap';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  collectMemoImageSources,
  removeMemoImagesBySource,
} from './memo-image-repair';

const memoDoc = (markdown: string): Y.Doc => {
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, markdownToYjsV2State(markdown));
  return doc;
};

describe('memo image repair', () => {
  it('finds repeated image references without losing their occurrence count', () => {
    const doc = memoDoc(
      [
        'before ![first](https://alkem.io/rest/storage/document/missing)',
        '',
        '- ![second](https://alkem.io/rest/storage/document/missing)',
      ].join('\n')
    );

    expect(collectMemoImageSources(doc)).toEqual(
      new Map([['https://alkem.io/rest/storage/document/missing', 2]])
    );
    doc.destroy();
  });

  it('removes only matching image nodes and preserves unrelated text, lists, tables, formatting, and valid images', () => {
    const missing = 'https://alkem.io/rest/storage/document/missing';
    const valid = 'https://alkem.io/rest/storage/document/valid';
    const paragraph = (...content: ProseMirrorNode[]) =>
      markdownSchema.nodes.paragraph.create(null, content);
    const text = (value: string, bold = false) =>
      markdownSchema.text(
        value,
        bold ? [markdownSchema.marks.bold.create()] : undefined
      );
    const image = (source: string, alt: string) =>
      markdownSchema.nodes.image.create({ src: source, alt });
    const doc = prosemirrorToYDoc(
      markdownSchema.nodes.doc.create(null, [
        markdownSchema.nodes.heading.create({ level: 1 }, text('Heading')),
        paragraph(
          text('before '),
          text('bold', true),
          text(' '),
          image(missing, 'lost'),
          text(' after')
        ),
        markdownSchema.nodes.bulletList.create(null, [
          markdownSchema.nodes.listItem.create(null, [
            paragraph(text('keep list '), image(missing, 'also lost')),
          ]),
          markdownSchema.nodes.listItem.create(null, [
            paragraph(text('keep valid '), image(valid, 'valid')),
          ]),
        ]),
        markdownSchema.nodes.table.create(null, [
          markdownSchema.nodes.tableRow.create(null, [
            markdownSchema.nodes.tableHeader.create(null, paragraph(text('A'))),
            markdownSchema.nodes.tableHeader.create(null, paragraph(text('B'))),
          ]),
          markdownSchema.nodes.tableRow.create(null, [
            markdownSchema.nodes.tableCell.create(null, paragraph(text('1'))),
            markdownSchema.nodes.tableCell.create(null, paragraph(text('2'))),
          ]),
        ]),
      ]),
      'default'
    );

    const before = yjsStateToMarkdown(
      Buffer.from(Y.encodeStateAsUpdateV2(doc))
    );
    expect(before).toContain(missing);
    expect(collectMemoImageSources(doc)).toEqual(
      new Map([
        [missing, 2],
        [valid, 1],
      ])
    );
    expect(removeMemoImagesBySource(doc, new Set([missing]))).toBe(2);
    expect(removeMemoImagesBySource(doc, new Set([missing]))).toBe(0);

    const markdown = yjsStateToMarkdown(
      Buffer.from(Y.encodeStateAsUpdateV2(doc))
    );
    expect(markdown).toContain('# Heading');
    expect(markdown).toContain('before **bold**  after');
    expect(markdown).toContain('- keep list');
    expect(markdown).toContain(`![valid](${valid})`);
    expect(markdown).toContain('| A | B |');
    expect(markdown).toContain('| 1 | 2 |');
    expect(markdown).not.toContain(missing);
    doc.destroy();
  });
});
