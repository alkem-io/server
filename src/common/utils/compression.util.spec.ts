import { compressText, decompressText } from '@common/utils/compression.util';

describe('Compression', () => {
  it('Should restore the original value when compressing and then decompressing back', async () => {
    const originalValue = 'TestTextCompression';

    const compressed = await compressText(originalValue);

    expect(await decompressText(compressed)).toEqual(originalValue);
  });
});
