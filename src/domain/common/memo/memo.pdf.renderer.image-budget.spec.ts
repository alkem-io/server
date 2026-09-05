import { ActorContext } from '@core/actor-context/actor.context';
import sharp from 'sharp';
import { MemoPdfRenderer } from './memo.pdf.renderer';

describe('MemoPdfRenderer normalized image budget', () => {
  it('rejects more than 16 MiB before PDF layout', async () => {
    const internalUrl =
      'https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-111111111111';
    const pixels = Buffer.alloc(1200 * 1200 * 3);
    let state = 0x12345678;
    for (let index = 0; index < pixels.length; index++) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      pixels[index] = state;
    }
    const source = await sharp(pixels, {
      raw: { width: 1200, height: 1200, channels: 3 },
    })
      .png({ compressionLevel: 1 })
      .toBuffer();
    const normalized = await sharp(source, { limitInputPixels: 16_777_216 })
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .toColourspace('srgb')
      .jpeg({ quality: 80 })
      .toBuffer();
    expect(normalized.length * 20).toBeGreaterThan(16 * 1024 * 1024);
    const renderer = new MemoPdfRenderer(
      {
        isAlkemioDocumentURL: () => true,
        getDocumentFromURL: async () => ({
          id: 'image-1',
          authorization: { id: 'image-auth' },
          storageBucket: { id: 'bucket-1' },
        }),
      } as any,
      { grantAccessOrFail: () => undefined } as any,
      { getDocumentContent: async () => source } as any
    );
    const convertHtml = vi.spyOn(renderer as any, 'convertHtml');

    let failure: unknown;
    try {
      await renderer.render(
        Array.from(
          { length: 20 },
          (_, index) => `![noise ${index}](${internalUrl})`
        ).join('\n'),
        'bucket-1',
        Object.assign(new ActorContext(), { actorID: 'actor-1' })
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toMatch(/16 MiB normalized size limit/i);
    expect(convertHtml).not.toHaveBeenCalled();
  }, 30_000);
});
