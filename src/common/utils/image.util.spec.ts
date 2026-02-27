import { Mock } from 'vitest';

describe('getImageDimensions', () => {
  let getImageDimensions: (
    imageBuffer: Buffer
  ) => Promise<{ imageHeight: number; imageWidth: number }>;
  let mockedSizeOf: Mock;

  beforeEach(async () => {
    vi.resetModules();
    mockedSizeOf = vi.fn();
    vi.doMock('image-size', () => ({ default: mockedSizeOf }));
    const mod = await import('./image.util');
    getImageDimensions = mod.getImageDimensions;
  });

  it('should return height and width from a valid image buffer', async () => {
    mockedSizeOf.mockReturnValue({
      height: 600,
      width: 800,
      type: 'png',
    });

    const result = await getImageDimensions(Buffer.from('fake-image'));
    expect(result).toEqual({ imageHeight: 600, imageWidth: 800 });
  });

  it('should call sizeOf with the provided buffer', async () => {
    mockedSizeOf.mockReturnValue({ height: 100, width: 100, type: 'jpg' });

    const buf = Buffer.from('test');
    await getImageDimensions(buf);
    expect(mockedSizeOf).toHaveBeenCalledWith(buf);
  });

  it('should handle square images', async () => {
    mockedSizeOf.mockReturnValue({ height: 256, width: 256, type: 'png' });

    const result = await getImageDimensions(Buffer.from('square'));
    expect(result.imageHeight).toBe(256);
    expect(result.imageWidth).toBe(256);
  });

  it('should handle very large dimensions', async () => {
    mockedSizeOf.mockReturnValue({
      height: 10000,
      width: 20000,
      type: 'tiff',
    });

    const result = await getImageDimensions(Buffer.from('large'));
    expect(result).toEqual({ imageHeight: 10000, imageWidth: 20000 });
  });

  it('should propagate errors from sizeOf', async () => {
    mockedSizeOf.mockImplementation(() => {
      throw new Error('unsupported image format');
    });

    await expect(
      getImageDimensions(Buffer.from('not-an-image'))
    ).rejects.toThrow('unsupported image format');
  });
});
