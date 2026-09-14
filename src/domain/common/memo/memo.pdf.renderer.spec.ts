import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { prosemirrorToYDoc } from '@tiptap/y-tiptap';
import { parseOffice } from 'officeparser';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import sharp from 'sharp';
import * as Y from 'yjs';
import { markdownToYjsV2State } from './conversion';
import { markdownSchema } from './conversion/markdown.schema';
import { memoSchema } from './conversion/memo.extensions';
import { memoFontFiles } from './memo.pdf.fonts';
import { MemoPdfRenderer } from './memo.pdf.renderer';

const pdfjsRequire = createRequire(require.resolve('pdfjs-dist/package.json'));
const { createCanvas } = pdfjsRequire(
  '@napi-rs/canvas'
) as typeof import('@napi-rs/canvas');

const pdfMake = require('pdfmake') as {
  localAccessPolicy(path: string): boolean;
  urlAccessPolicy(url: string): boolean;
};
const fonts = require('pdfmake/fonts/Roboto') as {
  Roboto: Record<string, string>;
};

type PdfMakeNode = Record<string, unknown>;

const collectPdfMakeNodes = (
  value: unknown,
  predicate: (node: PdfMakeNode) => boolean,
  seen = new WeakSet<object>()
): PdfMakeNode[] => {
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  const node = value as PdfMakeNode;
  return [
    ...(predicate(node) ? [node] : []),
    ...Object.values(node).flatMap(child =>
      collectPdfMakeNodes(child, predicate, seen)
    ),
  ];
};

const structuredMemoState = (): Buffer => {
  const paragraph = (text = '') =>
    markdownSchema.nodes.paragraph.create(
      null,
      text ? markdownSchema.text(text) : undefined
    );
  const listItem = markdownSchema.nodes.listItem.create(null, [
    paragraph('First paragraph inside item.'),
    paragraph('Second paragraph inside same item.'),
    paragraph('Third paragraph inside same item.'),
    markdownSchema.nodes.bulletList.create(null, [
      markdownSchema.nodes.listItem.create(null, [
        paragraph('Nested child'),
        markdownSchema.nodes.bulletList.create(null, [
          markdownSchema.nodes.listItem.create(null, [paragraph('Grandchild')]),
        ]),
      ]),
    ]),
  ]);
  const tableRows = Array.from({ length: 8 }, (_, rowIndex) => {
    const cellType =
      rowIndex === 0
        ? markdownSchema.nodes.tableHeader
        : markdownSchema.nodes.tableCell;
    return markdownSchema.nodes.tableRow.create(
      null,
      Array.from({ length: 3 }, (_, columnIndex) =>
        cellType.create(
          null,
          paragraph(
            rowIndex === 0
              ? `Column ${columnIndex + 1}`
              : `${rowIndex}${columnIndex + 1}`
          )
        )
      )
    );
  });
  const document = markdownSchema.nodes.doc.create(null, [
    markdownSchema.nodes.heading.create(
      { level: 1 },
      paragraph('Structure probe').content
    ),
    paragraph(),
    markdownSchema.nodes.bulletList.create(null, [listItem]),
    markdownSchema.nodes.table.create(null, tableRows),
    markdownSchema.nodes.heading.create(
      { level: 2 },
      paragraph('Heading after table').content
    ),
  ]) as ProseMirrorNode;
  const ydoc = prosemirrorToYDoc(document, 'default');
  try {
    return Buffer.from(Y.encodeStateAsUpdateV2(ydoc));
  } finally {
    ydoc.destroy();
  }
};

const mixedNestedListsState = (): Buffer => {
  const paragraph = (text: string) =>
    markdownSchema.nodes.paragraph.create(null, markdownSchema.text(text));
  const listItem = (...content: ProseMirrorNode[]) =>
    markdownSchema.nodes.listItem.create(null, content);
  const bulletList = (...items: ProseMirrorNode[]) =>
    markdownSchema.nodes.bulletList.create(null, items);
  const orderedList = (...items: ProseMirrorNode[]) =>
    markdownSchema.nodes.orderedList.create(null, items);
  const document = markdownSchema.nodes.doc.create(null, [
    bulletList(
      listItem(
        paragraph('Bullet top'),
        orderedList(
          listItem(
            paragraph('Ordered child'),
            bulletList(listItem(paragraph('Bullet grandchild')))
          )
        )
      )
    ),
    orderedList(
      listItem(
        paragraph('Ordered top'),
        bulletList(
          listItem(
            paragraph('Bullet child'),
            orderedList(listItem(paragraph('Ordered grandchild')))
          )
        )
      )
    ),
  ]) as ProseMirrorNode;
  const ydoc = prosemirrorToYDoc(document, 'default');
  try {
    return Buffer.from(Y.encodeStateAsUpdateV2(ydoc));
  } finally {
    ydoc.destroy();
  }
};

const extractText = async (pdf: Buffer): Promise<string> => {
  const document = await parseOffice(pdf, { fileType: 'pdf', ocr: false });
  return document.toText();
};

const countRenderedInk = async (pdf: Buffer): Promise<number> => {
  const document = await getDocument({ data: new Uint8Array(pdf) }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  await page.render({
    canvas: canvas as any,
    canvasContext: context as any,
    viewport,
  }).promise;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  await document.destroy();
  return pixels.reduce(
    (count, channel, index) =>
      index % 4 === 3 && channel > 0 && pixels[index - 3] < 240
        ? count + 1
        : count,
    0
  );
};

describe('MemoPdfRenderer', () => {
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const internalUrl =
    'https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-111111111111';
  const documentService = {
    isAlkemioDocumentURL: vi.fn((url: string) => url === internalUrl),
    getDocumentFromURL: vi.fn(),
  };
  const authorizationService = { grantAccessOrFail: vi.fn() };
  const fileServiceAdapter = { getDocumentContent: vi.fn() };
  class TestableMemoPdfRenderer extends MemoPdfRenderer {
    renderSanitizerFixture(
      html: string,
      bucketId: string,
      actorContext: ActorContext
    ) {
      return this.renderHtml(html, bucketId, actorContext);
    }
  }
  const renderer = new TestableMemoPdfRenderer(
    documentService as any,
    authorizationService as any,
    fileServiceAdapter as any
  );
  const renderMarkdown = (markdown: string, bucketId = 'bucket-1') =>
    renderer.render(
      Buffer.from(markdownToYjsV2State(markdown)),
      bucketId,
      actor
    );
  const renderDocument = (content: unknown[], bucketId = 'bucket-1') => {
    const ydoc = prosemirrorToYDoc(
      memoSchema.nodeFromJSON({ type: 'doc', content }),
      'default'
    );
    try {
      return renderer.render(
        Buffer.from(Y.encodeStateAsUpdateV2(ydoc)),
        bucketId,
        actor
      );
    } finally {
      ydoc.destroy();
    }
  };
  const image = (alt: string, src = internalUrl) => ({
    type: 'image',
    attrs: {
      src,
      alt,
      title: null,
      width: null,
      height: null,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    documentService.getDocumentFromURL.mockReset();
    authorizationService.grantAccessOrFail.mockReset();
    fileServiceAdapter.getDocumentContent.mockReset();
  });

  it('renders direct editor state into a real PDF with representative structure', async () => {
    const pdf = await renderMarkdown(
      [
        '# Capture heading',
        '',
        'Text with **bold**, *emphasis*, [a safe link](https://example.com), and `inline code`.',
        '',
        '- Parent',
        '  - Nested child',
        '',
        '```ts',
        'const preserved =  2;',
        '```',
        '',
        '| A | B |',
        '| --- | --- |',
        '| 1 | 2 |',
        '',
        '> quoted',
        '',
        'Γειά σου',
      ].join('\n'),
      'bucket-1'
    );

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const text = await extractText(pdf);
    expect(text).toContain('Capture heading');
    expect(text).toContain('Nested child');
    expect(text).toContain('const preserved = 2;');
    expect(text).toContain('A');
    expect(text).toContain('quoted');
    expect(text).toContain('Γειά σου');
  });

  it('preserves editor block structure through direct editor HTML', async () => {
    const convertHtml = vi.spyOn(renderer as any, 'convertHtml');

    try {
      await renderer.render(structuredMemoState(), 'bucket-1', actor);
      const converterHtml = convertHtml.mock.calls[0][0] as string;
      const definition = convertHtml.mock.results[0].value;

      expect.soft(converterHtml).toContain('<table>');

      const [topList] = (definition as PdfMakeNode[]).filter(
        node => node.nodeName === 'UL'
      );
      const topListItem = (topList.ul as PdfMakeNode[])[0];
      expect.soft(topListItem).toBeDefined();
      expect
        .soft(
          collectPdfMakeNodes(
            (topListItem.stack as PdfMakeNode[])[0],
            node => node.nodeName === 'P'
          ).map(node => node.text)
        )
        .toEqual([
          'First paragraph inside item.',
          'Second paragraph inside same item.',
          'Third paragraph inside same item.',
        ]);
      expect
        .soft(collectPdfMakeNodes(topListItem, node => node.nodeName === 'UL'))
        .toHaveLength(2);

      const tables = collectPdfMakeNodes(
        definition,
        node => node.nodeName === 'TABLE'
      );
      expect.soft(tables).toHaveLength(1);
      const body = (tables[0]?.table as { body?: unknown[][] } | undefined)
        ?.body;
      expect.soft(body).toHaveLength(8);
      expect.soft(body?.every(row => row.length === 3)).toBe(true);
      expect
        .soft(
          collectPdfMakeNodes(
            definition,
            node => node.nodeName === 'H1' || node.nodeName === 'H2'
          ).map(node => node.text)
        )
        .toEqual(['Structure probe', 'Heading after table']);
      expect
        .soft(
          collectPdfMakeNodes(
            definition,
            node => node.nodeName === 'P' && node.text === '\u00a0'
          )
        )
        .toHaveLength(1);
    } finally {
      convertHtml.mockRestore();
    }
  });

  it('preserves accumulated indentation through mixed nested list types', async () => {
    const convertHtml = vi.spyOn(renderer as any, 'convertHtml');

    try {
      await renderer.render(mixedNestedListsState(), 'bucket-1', actor);
      const definition = convertHtml.mock.results[0].value as PdfMakeNode[];
      const topLevelLists = definition.filter(
        node => node.nodeName === 'UL' || node.nodeName === 'OL'
      );
      const [bulletRoot, orderedRoot] = topLevelLists;
      const bulletTopItem = (bulletRoot?.ul as PdfMakeNode[] | undefined)?.[0];
      const orderedChildList = (
        bulletTopItem?.stack as PdfMakeNode[] | undefined
      )?.find(node => node.nodeName === 'OL');
      const orderedChildItem = (
        orderedChildList?.ol as PdfMakeNode[] | undefined
      )?.[0];
      const bulletGrandchildList = (
        orderedChildItem?.stack as PdfMakeNode[] | undefined
      )?.find(node => node.nodeName === 'UL');
      const orderedTopItem = (
        orderedRoot?.ol as PdfMakeNode[] | undefined
      )?.[0];
      const bulletChildList = (
        orderedTopItem?.stack as PdfMakeNode[] | undefined
      )?.find(node => node.nodeName === 'UL');
      const bulletChildItem = (
        bulletChildList?.ul as PdfMakeNode[] | undefined
      )?.[0];
      const orderedGrandchildList = (
        bulletChildItem?.stack as PdfMakeNode[] | undefined
      )?.find(node => node.nodeName === 'OL');

      expect.soft(topLevelLists).toHaveLength(2);
      expect.soft(orderedChildList?.nodeName).toBe('OL');
      expect.soft(bulletGrandchildList?.nodeName).toBe('UL');
      expect
        .soft(
          collectPdfMakeNodes(
            (bulletGrandchildList?.ul as PdfMakeNode[] | undefined)?.[0],
            node => node.nodeName === 'P'
          ).map(node => node.text)
        )
        .toContain('Bullet grandchild');
      expect.soft(bulletChildList?.nodeName).toBe('UL');
      expect.soft(orderedGrandchildList?.nodeName).toBe('OL');
      expect
        .soft(
          collectPdfMakeNodes(
            (orderedGrandchildList?.ol as PdfMakeNode[] | undefined)?.[0],
            node => node.nodeName === 'P'
          ).map(node => node.text)
        )
        .toContain('Ordered grandchild');
    } finally {
      convertHtml.mockRestore();
    }
  });

  it('renders European platform languages and a visible box for an unsupported symbol', async () => {
    const supported = [
      'Nederlands: officiële beëindiging',
      'Español: acción e información',
      'Български: подписан документ',
      'Deutsch: Größe und äußere',
      'Français: été, cœur où',
    ];
    const pdf = await renderMarkdown(supported.join('\n\n'), 'bucket-1');

    const text = await extractText(pdf);
    for (const sample of supported) expect(text).toContain(sample);
    expect(pdf.toString('latin1')).toContain('Roboto-Regular');

    // Roboto has no U+2713. Rendering that character alone must still put
    // visible replacement ink on the actual PDF page rather than omit it.
    const emptyInk = await countRenderedInk(await renderMarkdown(' '));
    const replacementInk = await countRenderedInk(await renderMarkdown('✓'));
    expect(replacementInk).toBeGreaterThan(emptyInk);
  });

  it('allows only the registered embedded fonts through the local access policy', () => {
    expect(pdfMake.urlAccessPolicy('https://example.com/font.ttf')).toBe(false);
    expect(pdfMake.localAccessPolicy(Object.values(fonts.Roboto)[0])).toBe(
      true
    );
    expect(Object.values(memoFontFiles)).toHaveLength(2);
    expect(pdfMake.localAccessPolicy(memoFontFiles.NotoEmoji)).toBe(true);
    expect(pdfMake.localAccessPolicy(memoFontFiles.NotoSansSymbols2)).toBe(
      true
    );
    expect(pdfMake.localAccessPolicy('/tmp/unregistered-font.ttf')).toBe(false);
  });

  it('renders current-projection highlight markers without exposing the markers', async () => {
    const text = await extractText(
      await renderMarkdown('Before ==highlighted== after')
    );

    expect(text).toContain('Before highlighted after');
    expect(text).not.toContain('==');
  });

  it('does not rewrite highlight-like text inside inline or fenced code', async () => {
    const text = await extractText(
      await renderMarkdown(
        ['`inline ==literal==`', '', '```ts', 'x ==literal== y', '```'].join(
          '\n'
        ),
        'bucket-1'
      )
    );

    expect(text).toContain('inline ==literal==');
    expect(text).toContain('x ==literal== y');
  });

  it('loads only an authorized image from the memo bucket', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      )
    );

    const pdf = await renderDocument([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Before ' },
          image('approved'),
          { type: 'text', text: ' after' },
        ],
      },
    ]);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(documentService.getDocumentFromURL).toHaveBeenCalledWith(
      internalUrl,
      { relations: { authorization: true, storageBucket: true } }
    );
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actor,
      { id: 'image-auth' },
      AuthorizationPrivilege.READ,
      'read signing image'
    );
    expect(fileServiceAdapter.getDocumentContent).toHaveBeenCalledWith(
      'image-1'
    );
  });

  it('normalizes an authorized image to bounded opaque JPEG for PDF pass-through', async () => {
    const convertHtml = vi.spyOn(renderer as any, 'convertHtml');
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      await sharp({
        create: {
          width: 2048,
          height: 1024,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer()
    );

    const pdf = await renderDocument([
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [image('bounded list image')] },
            ],
          },
        ],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Nested table image' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    content: [image('bounded table image')],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const imageObjects =
      pdf
        .toString('latin1')
        .match(
          /\d+ 0 obj\s*<<(?:(?!endobj)[\s\S])*?\/Subtype \/Image(?:(?!endobj)[\s\S])*?endobj/g
        ) ?? [];

    expect(convertHtml.mock.calls[0][0]).not.toContain('data:');
    expect(convertHtml.mock.calls[0][0]).toContain('memo-signing-image-0');
    expect(convertHtml.mock.calls[0][0]).toContain('memo-signing-image-1');
    expect(imageObjects).toHaveLength(2);
    for (const imageObject of imageObjects) {
      expect(imageObject).toContain('/Filter /DCTDecode');
      expect(imageObject).toContain('/Width 1200');
      expect(imageObject).toContain('/Height 600');
      expect(imageObject).toContain('/ColorSpace /DeviceRGB');
      expect(imageObject).not.toContain('/FlateDecode');
      expect(imageObject).not.toContain('/SMask');
    }
  });

  it('uses labelled safe links for external images and embeds without fetching', async () => {
    const pdf = await renderDocument([
      image('diagram', 'https://example.com/diagram.svg'),
      image('', 'https://example.com/no-alt.png'),
      {
        type: 'iframe',
        attrs: { src: 'https://example.com/embed' },
      },
    ]);
    const malformedEmbed = await renderer.renderSanitizerFixture(
      '<iframe src="%"></iframe>',
      'bucket-1',
      actor
    );

    const text = await extractText(pdf);
    expect(text).toContain('Image: diagram');
    expect(text).toContain('Image: https://example.com/no-alt.png');
    expect(text).toContain('Embedded content: https://example.com/embed');
    expect((await extractText(malformedEmbed)).replace(/\s+/g, ' ')).toContain(
      'Embedded content: %'
    );
    expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('never fetches authored local, data, or unsupported-scheme image URLs', async () => {
    const pdf = await renderDocument([
      image('local', 'file:///etc/passwd'),
      image('inline', 'data:text/plain,SECRET_DATA_TEXT'),
      image('ftp', 'ftp://example.com/image.png'),
    ]);

    const text = await extractText(pdf);
    expect(text).toContain('Image: ftp');
    expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('fails instead of turning an unauthorized private image into a link', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('denied');
    });

    await expect(renderDocument([image('private')])).rejects.toThrow('denied');
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('rejects an internal image belonging to another bucket', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'other-bucket' },
    });

    await expect(renderDocument([image('private')])).rejects.toThrow(
      /memo bucket/i
    );
    expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
  });

  it('rejects a missing private image without turning it into a link', async () => {
    documentService.getDocumentFromURL.mockResolvedValue(undefined);

    await expect(renderDocument([image('private')])).rejects.toThrow(
      /memo bucket/i
    );
    expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
    expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
  });

  it('uses a labelled link for an authorized but unsupported private image', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      Buffer.from('unsupported image bytes')
    );

    const pdf = await renderDocument([image('')]);

    expect(await extractText(pdf)).toContain(`Image: ${internalUrl}`);
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
  });

  it('propagates an unreadable private image instead of using fallback', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockRejectedValue(
      new Error('private read failed')
    );

    await expect(renderDocument([image('private')])).rejects.toThrow(
      'private read failed'
    );
  });

  it('removes authored scripts and converter overrides', async () => {
    const pdf = await renderMarkdown(
      '<script>SECRET_SCRIPT_TEXT</script><p data-pdfmake="{bad:true}" onclick="bad()">Visible</p><a href="file:///etc/passwd">Local link</a>',
      'bucket-1'
    );

    const text = await extractText(pdf);
    expect(text).toContain('Visible');
    expect(text).toContain('Local link');
    expect(text).not.toContain('SECRET_SCRIPT_TEXT');
  });

  it('replaces authored SVG instead of opening a nested server-local image', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'memo-pdf-svg-'));
    const localImage = join(directory, 'local.png');
    const firstImage = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 3,
        background: '#ff0000',
      },
    })
      .png()
      .toBuffer();
    const secondImage = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 3,
        background: '#0000ff',
      },
    })
      .png()
      .toBuffer();
    const markup = `<svg width="32" height="32"><image width="32" height="32" href="${localImage}" /></svg>`;

    try {
      await writeFile(localImage, firstImage);
      const withFirstFile = await renderMarkdown(markup);
      await writeFile(localImage, secondImage);
      const withSecondFile = await renderMarkdown(markup);
      await rm(localImage);
      const withoutFile = await renderMarkdown(markup);

      expect(await extractText(withFirstFile)).toContain('Unsupported content');
      const pdfs = [withFirstFile, withSecondFile, withoutFile];
      for (const pdf of pdfs)
        expect(pdf.toString('latin1')).not.toContain('/Subtype /Image');
      expect(new Set(pdfs.map(pdf => pdf.length)).size).toBe(1);
      expect(new Set(await Promise.all(pdfs.map(countRenderedInk))).size).toBe(
        1
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('preserves authored text in unsupported wrappers without enabling embedded content', async () => {
    const authoredMarkdown =
      '<section><div>Agreed <span>payment terms</span></div></section><object>hidden object text</object>';
    // The editor schema cannot emit section/object nodes. This direct seam
    // pins the renderer's defense-in-depth handling of unexpected HTML.
    const pdf = await renderer.renderSanitizerFixture(
      authoredMarkdown,
      'bucket-1',
      actor
    );

    const text = await extractText(pdf);
    expect(text).toContain('Agreed payment terms');
    expect(text).toContain('Unsupported content: object');
    expect(text).not.toContain('hidden object text');
  });
});
