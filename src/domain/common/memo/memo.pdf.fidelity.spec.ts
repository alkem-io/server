import { createHash } from 'node:crypto';
import { ActorContext } from '@core/actor-context/actor.context';
import { prosemirrorToYDoc } from '@tiptap/y-tiptap';
import { parseOffice } from 'officeparser';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import sharp from 'sharp';
import * as Y from 'yjs';
import { markdownSchema } from './conversion/markdown.schema';
import { memoSchema } from './conversion/memo.extensions';
import { MemoPdfRenderer } from './memo.pdf.renderer';

type PdfMakeNode = Record<string, unknown>;

const collectNodes = (
  value: unknown,
  predicate: (node: PdfMakeNode) => boolean
): PdfMakeNode[] => {
  const seen = new WeakSet<object>();
  const visit = (candidate: unknown): PdfMakeNode[] => {
    if (!candidate || typeof candidate !== 'object' || seen.has(candidate))
      return [];
    seen.add(candidate);
    const node = candidate as PdfMakeNode;
    return [
      ...(predicate(node) ? [node] : []),
      ...Object.values(node).flatMap(visit),
    ];
  };
  return visit(value);
};

const toState = (document: ProseMirrorNode): Buffer => {
  const ydoc = prosemirrorToYDoc(document, 'default');
  try {
    return Buffer.from(Y.encodeStateAsUpdateV2(ydoc));
  } finally {
    ydoc.destroy();
  }
};

const paragraph = (...content: ProseMirrorNode[]) =>
  markdownSchema.nodes.paragraph.create(
    null,
    content.length ? content : undefined
  );
const text = (value: string) => markdownSchema.text(value);
const listItem = (...content: ProseMirrorNode[]) =>
  markdownSchema.nodes.listItem.create(null, content);
const bulletList = (...items: ProseMirrorNode[]) =>
  markdownSchema.nodes.bulletList.create(null, items);
const orderedList = (...items: ProseMirrorNode[]) =>
  markdownSchema.nodes.orderedList.create(null, items);

const tableCellBlocksState = (): Buffer => {
  const rows = Array.from({ length: 8 }, (_, rowIndex) => {
    const cellType =
      rowIndex === 0
        ? markdownSchema.nodes.tableHeader
        : markdownSchema.nodes.tableCell;
    return markdownSchema.nodes.tableRow.create(
      null,
      Array.from({ length: 3 }, (_, columnIndex) => {
        if (rowIndex === 1 && columnIndex === 0)
          return cellType.create(null, [
            paragraph(text('Cell paragraph one')),
            paragraph(text('Cell paragraph two')),
            bulletList(
              listItem(paragraph(text('Cell bullet one'))),
              listItem(paragraph(text('Cell bullet two')))
            ),
          ]);
        return cellType.create(
          null,
          paragraph(
            text(
              rowIndex === 0
                ? `Column ${columnIndex + 1}`
                : `${rowIndex}${columnIndex + 1}`
            )
          )
        );
      })
    );
  });
  return toState(
    markdownSchema.nodes.doc.create(
      null,
      markdownSchema.nodes.table.create(null, rows)
    )
  );
};

const lineBreakAndBlankState = (): Buffer =>
  toState(
    markdownSchema.nodes.doc.create(null, [
      bulletList(
        listItem(
          paragraph(
            text('First line'),
            markdownSchema.nodes.hardBreak.create(),
            text('Second line')
          ),
          paragraph(),
          paragraph(text('Third paragraph in item'))
        )
      ),
      paragraph(),
      paragraph(text('Paragraph after list')),
      markdownSchema.nodes.heading.create(
        { level: 2 },
        text('Heading after list')
      ),
    ])
  );

const mixedListsState = (): Buffer =>
  toState(
    markdownSchema.nodes.doc.create(null, [
      bulletList(
        listItem(
          paragraph(text('Bullet top')),
          orderedList(
            listItem(
              paragraph(text('Ordered child')),
              bulletList(listItem(paragraph(text('Bullet grandchild'))))
            )
          )
        )
      ),
      orderedList(
        listItem(
          paragraph(text('Ordered top')),
          bulletList(
            listItem(
              paragraph(text('Bullet child')),
              orderedList(listItem(paragraph(text('Ordered grandchild'))))
            )
          )
        )
      ),
    ])
  );

describe('Memo PDF editor fidelity contract', () => {
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const internalUrl =
    'https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-111111111111';
  const documentService = {
    isAlkemioDocumentURL: vi.fn((url: string) => url === internalUrl),
    getDocumentFromURL: vi.fn(),
  };
  const authorizationService = { grantAccessOrFail: vi.fn() };
  const fileServiceAdapter = { getDocumentContent: vi.fn() };
  const renderer = new MemoPdfRenderer(
    documentService as never,
    authorizationService as never,
    fileServiceAdapter as never
  );

  const renderSigningState = async (state: Buffer) => {
    const originalConvertHtml = (renderer as any).convertHtml;
    let definition: unknown;
    const convertHtml = vi
      .spyOn(renderer as any, 'convertHtml')
      .mockImplementation((...args: unknown[]) => {
        const result = originalConvertHtml(...args);
        definition = structuredClone(result);
        return result;
      });
    try {
      const pdf = await renderer.render(state, 'bucket-1', actor);
      return {
        html: convertHtml.mock.calls[0]?.[0] as string,
        definition,
        pdf,
      };
    } finally {
      convertHtml.mockRestore();
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('matches the current client 3.11 memo schema contract', () => {
    const signature = {
      nodes: Object.entries(memoSchema.nodes).map(([name, type]) => ({
        name,
        attrs: Object.keys(type.spec.attrs ?? {}).sort(),
        content: type.spec.content ?? null,
        inline: type.spec.inline ?? false,
        group: type.spec.group ?? null,
      })),
      marks: Object.entries(memoSchema.marks).map(([name, type]) => ({
        name,
        attrs: Object.keys(type.spec.attrs ?? {}).sort(),
        excludes: type.spec.excludes ?? null,
      })),
    };
    expect(
      createHash('sha256').update(JSON.stringify(signature)).digest('hex')
    ).toBe('45086477e85398998a71262ecc43684610a7049bc4b97f78ad71a6c53e78717b');
  });

  it('preserves paragraphs and nested lists inside an eight-row table cell', async () => {
    const result = await renderSigningState(tableCellBlocksState());
    const [table] = collectNodes(
      result.definition,
      node => node.nodeName === 'TABLE'
    );
    const body = (table.table as { body: PdfMakeNode[][] }).body;
    const specialCell = body[1][0];

    expect(body).toHaveLength(8);
    expect(body.every(row => row.length === 3)).toBe(true);
    expect(
      collectNodes(specialCell, node => node.nodeName === 'P').map(
        node => node.text
      )
    ).toEqual([
      'Cell paragraph one',
      'Cell paragraph two',
      'Cell bullet one',
      'Cell bullet two',
    ]);
    expect(
      collectNodes(specialCell, node => node.nodeName === 'UL')
    ).toHaveLength(1);
  });

  it('preserves a hard break and authored empty paragraphs inside and after a list', async () => {
    const result = await renderSigningState(lineBreakAndBlankState());

    expect(
      collectNodes(result.definition, node => node.nodeName === 'BR')
    ).toHaveLength(1);
    expect(
      collectNodes(
        result.definition,
        node => node.nodeName === 'P' && node.text === '\u00a0'
      )
    ).toHaveLength(2);
    expect(
      collectNodes(result.definition, node => node.nodeName === 'H2')
    ).toEqual([expect.objectContaining({ text: 'Heading after list' })]);
    expect(
      (await parseOffice(result.pdf, { fileType: 'pdf', ocr: false })).toText()
    ).toContain('Paragraph after list');
  });

  it('preserves both alternating three-level list hierarchies', async () => {
    const result = await renderSigningState(mixedListsState());
    const topLevelLists = (result.definition as PdfMakeNode[]).filter(
      node => node.nodeName === 'UL' || node.nodeName === 'OL'
    );

    expect(topLevelLists).toHaveLength(2);
    expect(
      collectNodes(topLevelLists[0], node => node.nodeName === 'OL')
    ).toHaveLength(1);
    expect(
      collectNodes(topLevelLists[0], node => node.nodeName === 'UL')
    ).toHaveLength(2);
    expect(
      collectNodes(topLevelLists[1], node => node.nodeName === 'UL')
    ).toHaveLength(1);
    expect(
      collectNodes(topLevelLists[1], node => node.nodeName === 'OL')
    ).toHaveLength(2);
  });

  it('preserves a current-client underline and explicit image dimensions', async () => {
    const clientState = Buffer.from(
      'AAMAAwEG5p7W7BwICAADADZ4PAEBAAsHAQYAhACGAIcAKF5TZGVmYXVsdHBhcmFncmFwaHVuZGVybGluZVVuZGVybGluZWQgZnJvbSBjbGllbnQgMy4xMXVuZGVybGluZWltYWdlc3JjYWx0d2lkdGhoZWlnaHQHSQAbCQVDAAUGAwEAAAMDBgMCQQIBCgB2AH53V2h0dHBzOi8vYWxrZW0uaW8vYXBpL3ByaXZhdGUvcmVzdC9zdG9yYWdlL2RvY3VtZW50LzExMTExMTExLTExMTEtNDExMS04MTExLTExMTExMTExMTExMXcRQ2xpZW50IGRpbWVuc2lvbnN9gAV9tAIA',
      'base64'
    );
    expect(createHash('sha256').update(clientState).digest('hex')).toBe(
      '08b5ff9e44daae26c51c43ccac3b11907c1c9e1c6fcdc4a15f2a465c663dc545'
    );
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      await sharp({
        create: {
          width: 320,
          height: 180,
          channels: 3,
          background: { r: 30, g: 80, b: 140 },
        },
      })
        .png()
        .toBuffer()
    );

    const result = await renderSigningState(clientState);
    expect(result.html).toContain('<u>Underlined from client 3.11</u>');
    expect(result.html).toMatch(/width=(?:"320"|320)/);
    expect(result.html).toMatch(/height=(?:"180"|180)/);
    const [image] = collectNodes(
      result.definition,
      node => typeof node.image === 'string'
    );
    expect(image.width).toEqual(expect.any(Number));
    expect(image.height).toEqual(expect.any(Number));
    expect(Number(image.width) / Number(image.height)).toBeCloseTo(
      320 / 180,
      1
    );
  });
});
