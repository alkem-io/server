import { base64ToBuffer } from './base64.to.buffer';

describe('base64ToBuffer', () => {
  const pngPixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('should return a Buffer when given a valid base64 data URI', () => {
    const input = `data:image/png;base64,${pngPixelBase64}`;
    const result = base64ToBuffer(input);
    expect(result).toBeInstanceOf(Buffer);
    expect(result!.length).toBeGreaterThan(0);
  });

  it('should correctly decode the base64 payload', () => {
    const payload = Buffer.from('hello').toString('base64');
    const input = `data:image/png;base64,${payload}`;
    const result = base64ToBuffer(input);
    expect(result!.toString()).toBe('hello');
  });

  it.each([
    { input: '', description: 'empty string' },
    { input: 'not-a-data-uri', description: 'plain text' },
    { input: 'data:text/plain;base64,abc', description: 'non-image MIME type' },
    { input: 'data:image/png;abc', description: 'missing base64 marker' },
  ])(
    'should return undefined for $description',
    ({ input }) => {
      expect(base64ToBuffer(input)).toBeUndefined();
    }
  );

  it.each([
    { mime: 'png', description: 'PNG' },
    { mime: 'jpeg', description: 'JPEG' },
    { mime: 'gif', description: 'GIF' },
    { mime: 'webp', description: 'WebP' },
    { mime: 'svg', description: 'SVG' },
  ])(
    'should handle $description image MIME type',
    ({ mime }) => {
      const input = `data:image/${mime};base64,${pngPixelBase64}`;
      const result = base64ToBuffer(input);
      expect(result).toBeInstanceOf(Buffer);
    }
  );
});
