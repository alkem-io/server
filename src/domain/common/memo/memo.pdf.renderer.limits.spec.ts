import { ActorContext } from '@core/actor-context/actor.context';
import { renderToHTMLString } from '@tiptap/static-renderer';
import {
  prosemirrorToYDoc,
  yXmlFragmentToProseMirrorRootNode,
} from '@tiptap/y-tiptap';
import sharp from 'sharp';
import * as Y from 'yjs';
import { markdownToYjsV2State } from './conversion';
import { memoSchema } from './conversion/memo.extensions';
import { MAX_MEMO_EDITOR_CONTENT_BYTES } from './conversion/yjs.state.to.tiptap.html';
import { MemoPdfRenderer } from './memo.pdf.renderer';

const MAX_IMAGES = 20;
const PATHOLOGICAL_RENDER_TIMEOUT_MS = 120_000;

vi.mock('@tiptap/static-renderer', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@tiptap/static-renderer')>();
  return { ...actual, renderToHTMLString: vi.fn(actual.renderToHTMLString) };
});

const fitAsciiBytes = (prefix: string, bytes: number): string => {
  const paragraph =
    'Representative signed memo paragraph with **bold**, *emphasis*, and a [link](https://example.com).\n\n';
  return `${prefix}${paragraph.repeat(Math.ceil(bytes / paragraph.length))}`.slice(
    0,
    bytes
  );
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

const emptyParagraphState = (count: number): Buffer => {
  const document = memoSchema.nodes.doc.create(
    null,
    Array.from({ length: count }, () => memoSchema.nodes.paragraph.create())
  );
  const ydoc = prosemirrorToYDoc(document, 'default');
  try {
    return Buffer.from(Y.encodeStateAsUpdateV2(ydoc));
  } finally {
    ydoc.destroy();
  }
};

const editorState = (content: unknown[]): Buffer => {
  const document = memoSchema.nodeFromJSON({ type: 'doc', content });
  const ydoc = prosemirrorToYDoc(document, 'default');
  try {
    return Buffer.from(Y.encodeStateAsUpdateV2(ydoc));
  } finally {
    ydoc.destroy();
  }
};

const image = (src: string, alt: string) => ({
  type: 'image',
  attrs: { src, alt, title: null, width: null, height: null },
});

describe('MemoPdfRenderer input bounds', () => {
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
    documentService as any,
    authorizationService as any,
    fileServiceAdapter as any
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderToHTMLString).mockClear();
  });

  const stateFor = (markdown: string) =>
    Buffer.from(markdownToYjsV2State(markdown));

  it(
    'renders a representative near-limit editor fixture and reports duration',
    async () => {
      const markdown = fitAsciiBytes(
        [
          '# Maximum signing preview',
          '',
          '- first list item',
          '- second list item',
          '',
          '| Column A | Column B |',
          '| --- | --- |',
          '| value A | value B |',
          '',
        ].join('\n'),
        205_000
      );
      const state = stateFor(markdown);
      const jsonBytes = proseMirrorJsonBytes(state);
      expect(state.byteLength).toBeLessThan(MAX_MEMO_EDITOR_CONTENT_BYTES);
      expect(jsonBytes).toBeGreaterThan(950_000);
      expect(jsonBytes).toBeLessThan(MAX_MEMO_EDITOR_CONTENT_BYTES);

      const started = performance.now();
      const pdf = await renderer.render(state, 'bucket-1', actor);
      const elapsed = performance.now() - started;
      process.stdout.write(
        `memo-signing-render editor-state=${state.byteLength} prose-mirror-json=${jsonBytes} source-text=${Buffer.byteLength(markdown)} images=0 pixels=0 ms=${elapsed.toFixed(1)}\n`
      );

      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      // The strict render-time budget runs in the isolated real-services lane.
      // This shared-runner coverage test only fails on a pathological hang.
    },
    PATHOLOGICAL_RENDER_TIMEOUT_MS
  );

  it('rejects encoded editor state larger than 1,000,000 bytes before decoding', async () => {
    await expect(
      renderer.render(
        Buffer.alloc(MAX_MEMO_EDITOR_CONTENT_BYTES + 1),
        'bucket-1',
        actor
      )
    ).rejects.toThrow(/1,000,000 bytes of memo editor content/i);
    expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
  });

  it('rejects compact editor state whose decoded structure exceeds the limit before static rendering', async () => {
    const state = emptyParagraphState(48_000);
    expect(state.byteLength).toBeLessThan(MAX_MEMO_EDITOR_CONTENT_BYTES);
    expect(proseMirrorJsonBytes(state)).toBeGreaterThan(
      MAX_MEMO_EDITOR_CONTENT_BYTES
    );

    await expect(renderer.render(state, 'bucket-1', actor)).rejects.toThrow(
      /1,000,000 bytes of memo editor content/i
    );

    expect(renderToHTMLString).not.toHaveBeenCalled();
    expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
  });

  it('rejects more than 20 images before resolving any image', async () => {
    const images = Array.from({ length: MAX_IMAGES + 1 }, (_, index) =>
      image(internalUrl, `image ${index}`)
    );

    await expect(
      renderer.render(editorState(images), 'bucket-1', actor)
    ).rejects.toThrow(/20 images/i);
    expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
  });

  it('accepts a highly compressible image at the 16,777,216 source-pixel boundary', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      await sharp({
        create: {
          width: 4096,
          height: 4096,
          channels: 3,
          background: { r: 80, g: 120, b: 180 },
        },
      })
        .png()
        .toBuffer()
    );

    const pdf = await renderer.render(
      editorState([image(internalUrl, 'source boundary')]),
      'bucket-1',
      actor
    );

    expect(pdf.toString('latin1')).toContain('/Filter /DCTDecode');
    expect(pdf.toString('latin1')).toContain('/Width 1200');
  });

  it('rejects a source above 16,777,216 pixels with an actionable error', async () => {
    documentService.getDocumentFromURL.mockResolvedValue({
      id: 'image-1',
      authorization: { id: 'image-auth' },
      storageBucket: { id: 'bucket-1' },
    });
    fileServiceAdapter.getDocumentContent.mockResolvedValue(
      await sharp({
        create: {
          width: 4097,
          height: 4096,
          channels: 3,
          background: { r: 80, g: 120, b: 180 },
        },
      })
        .png()
        .toBuffer()
    );

    await expect(
      renderer.render(
        editorState([image(internalUrl, 'too large')]),
        'bucket-1',
        actor
      )
    ).rejects.toThrow(/16,777,216 source pixels/i);
  });
});
