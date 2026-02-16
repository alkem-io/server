import { calculateBufferHash } from './calculate.buffer.hash';

describe('calculateBufferHash', () => {
  it('should return a hex string', () => {
    const buf = Buffer.from('hello');
    const hash = calculateBufferHash(buf);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('should return a SHA3-256 hash (64 hex characters)', () => {
    const buf = Buffer.from('test data');
    const hash = calculateBufferHash(buf);
    expect(hash).toHaveLength(64);
  });

  it('should return the same hash for the same input', () => {
    const buf1 = Buffer.from('deterministic');
    const buf2 = Buffer.from('deterministic');
    expect(calculateBufferHash(buf1)).toBe(calculateBufferHash(buf2));
  });

  it('should return different hashes for different inputs', () => {
    const hash1 = calculateBufferHash(Buffer.from('input-a'));
    const hash2 = calculateBufferHash(Buffer.from('input-b'));
    expect(hash1).not.toBe(hash2);
  });

  it('should handle an empty buffer', () => {
    const hash = calculateBufferHash(Buffer.alloc(0));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('should handle binary data', () => {
    const buf = Buffer.from([0x00, 0xff, 0x7f, 0x80]);
    const hash = calculateBufferHash(buf);
    expect(hash).toHaveLength(64);
  });

  it('should produce a known SHA3-256 hash for "hello"', () => {
    // SHA3-256 of "hello" is a well-known value
    const buf = Buffer.from('hello');
    const hash = calculateBufferHash(buf);
    expect(hash).toBe(
      '3338be694f50c5f338814986cdf0686453a888b84f424d792af4b9202398f392'
    );
  });
});
