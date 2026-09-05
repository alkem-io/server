import { ActorContext } from '@core/actor-context/actor.context';
import sharp from 'sharp';
import { MemoPdfRenderer } from './memo.pdf.renderer';

const MAX_MARKDOWN_BYTES = 100_000;
const MAX_IMAGES = 20;
const PREVIEW_TARGET_MS = 10_000;

const fitAsciiBytes = (prefix: string, bytes: number): string => {
  const paragraph =
    'Representative signed memo paragraph with **bold**, *emphasis*, and a [link](https://example.com).\n\n';
  return `${prefix}${paragraph.repeat(Math.ceil(bytes / paragraph.length))}`.slice(
    0,
    bytes
  );
};

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
  });

  it('renders the 100,000-byte structured fixture within the preview target', async () => {
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
      MAX_MARKDOWN_BYTES
    );
    expect(Buffer.byteLength(markdown)).toBe(MAX_MARKDOWN_BYTES);

    const started = performance.now();
    const pdf = await renderer.render(markdown, 'bucket-1', actor);
    const elapsed = performance.now() - started;
    process.stdout.write(
      `memo-signing-render max-text bytes=${MAX_MARKDOWN_BYTES} images=0 pixels=0 ms=${elapsed.toFixed(1)}\n`
    );

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(elapsed).toBeLessThan(PREVIEW_TARGET_MS);
  });

  it('rejects markdown larger than 100,000 UTF-8 bytes before rendering', async () => {
    await expect(
      renderer.render('a'.repeat(MAX_MARKDOWN_BYTES + 1), 'bucket-1', actor)
    ).rejects.toThrow(/100,000 bytes/i);
    expect(documentService.getDocumentFromURL).not.toHaveBeenCalled();
  });

  it('rejects more than 20 images before resolving any image', async () => {
    const markdown = Array.from(
      { length: MAX_IMAGES + 1 },
      (_, index) => `![image ${index}](${internalUrl})`
    ).join('\n');

    await expect(renderer.render(markdown, 'bucket-1', actor)).rejects.toThrow(
      /20 images/i
    );
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
      `![source-boundary](${internalUrl})`,
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
      renderer.render(`![too-large](${internalUrl})`, 'bucket-1', actor)
    ).rejects.toThrow(/16,777,216 source pixels/i);
  });
});
