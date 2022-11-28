import CompressionUtil from '@common/utils/compression.util';

describe('Compression', () => {
  it('Should restore the original value when compressing and then decompressing back', async () => {
    const originalValue = 'GeeksForGeeks';

    const compression = new CompressionUtil();

    const compressed = await compression.compress(originalValue);

    expect(await compression.uncompress(compressed)).toEqual(originalValue);
  });
});
