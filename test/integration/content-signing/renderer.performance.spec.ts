import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ActorContext } from '@core/actor-context/actor.context';
import { memoSchema } from '@domain/common/memo/conversion/memo.extensions';
import { MAX_MEMO_EDITOR_CONTENT_BYTES } from '@domain/common/memo/conversion/yjs.state.to.tiptap.html';
import { MemoPdfRenderer } from '@domain/common/memo/memo.pdf.renderer';
import {
  prosemirrorToYDoc,
  yXmlFragmentToProseMirrorRootNode,
} from '@tiptap/y-tiptap';
import sharp from 'sharp';
import * as Y from 'yjs';

const describeRealServices =
  process.env.CONTENT_SIGNING_REAL_SERVICES === 'true'
    ? describe
    : describe.skip;

const imageUrl = (index: number) =>
  `https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-${index.toString().padStart(12, '0')}`;
const realisticSources = [
  'docs/images/alkemio-server-design.png',
  'docs/images/login-session-extend-flow.png',
  'docs/images/alkemio-services-networking.png',
  'docs/images/pagination-efficiency.png',
  'docs/images/templates-domain.png',
];

const representativeParagraph = {
  type: 'paragraph',
  content: [
    { type: 'text', text: 'Representative signed memo paragraph with ' },
    { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
    { type: 'text', text: ', ' },
    { type: 'text', marks: [{ type: 'italic' }], text: 'emphasis' },
    { type: 'text', text: ', and a ' },
    {
      type: 'text',
      marks: [
        {
          type: 'link',
          attrs: {
            href: 'https://example.com',
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
            class: null,
          },
        },
      ],
      text: 'link',
    },
    { type: 'text', text: '.' },
  ],
};
const representativeTextBytes = Buffer.byteLength(
  representativeParagraph.content.map(node => node.text).join('')
);
const plainRepresentativeParagraph = {
  type: 'paragraph',
  content: [
    {
      type: 'text',
      text: representativeParagraph.content.map(node => node.text).join(''),
    },
  ],
};

const editorState = (imageCount: number, textBytes: number): Buffer => {
  const content = [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Bounded signing preview' }],
    },
    {
      type: 'bulletList',
      content: ['first list item', 'second list item'].map(text => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      })),
    },
    {
      type: 'table',
      content: [
        ['Column A', 'Column B'],
        ['value A', 'value B'],
      ].map((row, rowIndex) => ({
        type: 'tableRow',
        content: row.map(text => ({
          type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
          content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
        })),
      })),
    },
    ...Array.from({ length: imageCount }, (_, index) => ({
      type: 'image',
      attrs: {
        src: imageUrl(index),
        alt: `bounded image ${index}`,
        title: null,
        width: null,
        height: null,
      },
    })),
    ...Array.from(
      { length: Math.ceil(textBytes / representativeTextBytes) },
      (_, index) =>
        structuredClone(
          index % 5 < 3 ? representativeParagraph : plainRepresentativeParagraph
        )
    ),
  ];
  const document = memoSchema.nodeFromJSON({ type: 'doc', content });
  const ydoc = prosemirrorToYDoc(document, 'default');
  try {
    return Buffer.from(Y.encodeStateAsUpdateV2(ydoc));
  } finally {
    ydoc.destroy();
  }
};

const proseMirrorJsonBytes = (state: Buffer): number => {
  const document = new Y.Doc();
  try {
    Y.applyUpdateV2(document, new Uint8Array(state));
    const content = yXmlFragmentToProseMirrorRootNode(
      document.getXmlFragment('default'),
      memoSchema
    );
    return Buffer.byteLength(JSON.stringify(content.toJSON()));
  } finally {
    document.destroy();
  }
};

const noisyJpeg = () =>
  sharp(randomBytes(1200 * 1200 * 3), {
    raw: { width: 1200, height: 1200, channels: 3 },
  })
    .jpeg({ quality: 65 })
    .toBuffer();

const createRenderer = (sources: Buffer[]) => {
  const documents = new Map(
    sources.map((source, index) => [imageUrl(index), { index, source }])
  );
  return new MemoPdfRenderer(
    {
      isAlkemioDocumentURL: (url: string) => documents.has(url),
      getDocumentFromURL: async (url: string) => ({
        id: url,
        authorization: { id: `auth-${url}` },
        storageBucket: { id: 'bucket-1' },
      }),
    } as any,
    { grantAccessOrFail: () => undefined } as any,
    {
      getDocumentContent: async (url: string) => documents.get(url)!.source,
    } as any
  );
};

const renderAndAssert = async (
  label: string,
  sources: Buffer[],
  sourceTextBytes: number
) => {
  const renderer = createRenderer(sources);
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const started = performance.now();
  const state = editorState(sources.length, sourceTextBytes);
  const jsonBytes = proseMirrorJsonBytes(state);
  const pdf = await renderer.render(state, 'bucket-1', actor);
  const elapsed = performance.now() - started;
  const pdfText = pdf.toString('latin1');
  const imageObjects = pdfText.match(/\/Subtype \/Image/g)?.length ?? 0;
  const dctImages = pdfText.match(/\/DCTDecode/g)?.length ?? 0;

  process.stdout.write(
    `memo-render-ci case=${label} samples=1 editorState=${state.byteLength} proseMirrorJson=${jsonBytes} sourceText=${sourceTextBytes} images=${sources.length} sourceBytes=${sources.reduce((sum, source) => sum + source.length, 0)} pdf=${pdf.length} imageObjects=${imageObjects} dct=${dctImages} ms=${elapsed.toFixed(1)} maxRssMiB=${(process.resourceUsage().maxRSS / 1024).toFixed(1)}\n`
  );
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(imageObjects).toBe(sources.length);
  expect(dctImages).toBe(sources.length);
  if (label === 'maximum') {
    expect(jsonBytes).toBeGreaterThan(MAX_MEMO_EDITOR_CONTENT_BYTES - 10_000);
    expect(jsonBytes).toBeLessThan(MAX_MEMO_EDITOR_CONTENT_BYTES);
  }
  expect(elapsed).toBeLessThan(10_000);
};

describeRealServices('MemoPdfRenderer bounded fixture performance', () => {
  it('renders a representative structured memo with five repository images', async () => {
    const sources = await Promise.all(
      realisticSources.map(path => readFile(resolve(process.cwd(), path)))
    );
    await renderAndAssert('representative', sources, 50_000);
  }, 30_000);

  it('renders the maximum text and image-count fixture inside the target', async () => {
    const sources: Buffer[] = [];
    for (let index = 0; index < 20; index++) sources.push(await noisyJpeg());
    await renderAndAssert('maximum', sources, 205_000);
  }, 60_000);
});
