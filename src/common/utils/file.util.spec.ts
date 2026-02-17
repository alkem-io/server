import { Readable } from 'stream';
import { streamToBuffer } from './file.util';

describe('streamToBuffer', () => {
  it('should convert a readable stream to a buffer', async () => {
    const stream = Readable.from([Buffer.from('hello world')]);
    const result = await streamToBuffer(stream);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('hello world');
  });

  it('should concatenate multiple chunks into a single buffer', async () => {
    const stream = Readable.from([
      Buffer.from('chunk1'),
      Buffer.from('chunk2'),
      Buffer.from('chunk3'),
    ]);
    const result = await streamToBuffer(stream);
    expect(result.toString()).toBe('chunk1chunk2chunk3');
  });

  it('should return an empty buffer for an empty stream', async () => {
    const stream = Readable.from([]);
    const result = await streamToBuffer(stream);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(0);
  });

  it('should handle binary data', async () => {
    const binaryData = Buffer.from([0x00, 0xff, 0x7f, 0x80, 0x01]);
    const stream = Readable.from([binaryData]);
    const result = await streamToBuffer(stream);
    expect(result).toEqual(binaryData);
  });

  it('should reject when the stream emits an error', async () => {
    const stream = new Readable({
      read() {
        this.destroy(new Error('stream failure'));
      },
    });

    await expect(streamToBuffer(stream)).rejects.toThrow('stream failure');
  });

  it('should handle a stream with a single large chunk', async () => {
    const largeData = Buffer.alloc(1024 * 1024, 'x'); // 1 MB
    const stream = Readable.from([largeData]);
    const result = await streamToBuffer(stream);
    expect(result.length).toBe(1024 * 1024);
    expect(result.equals(largeData)).toBe(true);
  });
});
