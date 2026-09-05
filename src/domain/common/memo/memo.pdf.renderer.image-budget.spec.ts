import { randomBytes } from 'node:crypto';
import { ActorContext } from '@core/actor-context/actor.context';
import sharp from 'sharp';
import { MemoPdfRenderer } from './memo.pdf.renderer';

describe('MemoPdfRenderer normalized image budget', () => {
  it('rejects more than 16 MiB before PDF layout', async () => {
    const internalUrl =
      'https://alkem.io/api/private/rest/storage/document/11111111-1111-4111-8111-111111111111';
    const source = await sharp(randomBytes(1200 * 1200 * 3), {
      raw: { width: 1200, height: 1200, channels: 3 },
    })
      .png({ compressionLevel: 1 })
      .toBuffer();
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
