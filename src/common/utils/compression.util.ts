import { promisify } from 'util';
import { deflate, inflate } from 'zlib';

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

// For PostgreSQL compatibility, we use base64 encoding since:
// 1. PostgreSQL text columns don't allow null bytes (0x00)
// 2. Base64 is text-safe and portable across databases
const COMPRESSED_STRING_ENCODING = 'base64';

/**
 * Check if a string appears to be base64 encoded.
 * Base64 strings only contain [A-Za-z0-9+/=] characters.
 * Note: Some base64 encoders add newlines every 76 chars, so we allow those too.
 */
const isBase64 = (value: string): boolean => {
  if (!value || value.length < 4) return false;
  // Allow newlines (\n, \r) which some encoders add
  return /^[A-Za-z0-9+/=\n\r]+$/.test(value);
};

/**
 * Check if a string appears to be legacy binary-encoded compressed data.
 * Legacy format starts with 0x78 ('x') which is the zlib header.
 */
const isLegacyBinaryFormat = (value: string): boolean => {
  if (!value || value.length < 2) return false;
  // Check for zlib header: first byte should be 0x78 (character 'x')
  return value.codePointAt(0) === 0x78;
};

/**
 * Check if a buffer has a valid zlib header.
 * Zlib header is 2 bytes: CMF (compression method and flags) and FLG (flags).
 * CMF is typically 0x78 for deflate with 32K window.
 * FLG varies but common values are 0x01, 0x5E, 0x9C, 0xDA.
 * The header must satisfy: (CMF * 256 + FLG) % 31 === 0
 */
const hasValidZlibHeader = (buffer: Buffer): boolean => {
  if (buffer.length < 2) return false;
  const cmf = buffer[0];
  const flg = buffer[1];

  // CMF should be 0x78 for deflate compression
  if (cmf !== 0x78) return false;

  // Check zlib header checksum: (CMF * 256 + FLG) must be divisible by 31
  return (cmf * 256 + flg) % 31 === 0;
};

export const compressText = async (value: string): Promise<string> => {
  const compressedBuffer = await deflateAsync(value);
  return compressedBuffer.toString(COMPRESSED_STRING_ENCODING);
};

export const decompressText = async (value: string): Promise<string> => {
  let compressedBuffer: Buffer;

  if (isLegacyBinaryFormat(value) && !isBase64(value)) {
    // Raw binary format - data starts with 'x' (0x78 zlib header)
    // and contains non-base64 characters. This is legacy data
    // that was stored as binary and not converted to base64 during export.
    // Interpret each character code as a byte value (latin1 encoding).
    compressedBuffer = Buffer.from(value, 'latin1');
  } else if (isBase64(value)) {
    // Base64 encoded data - could be:
    // 1. New format: base64 of raw compressed bytes
    // 2. Legacy migrated: base64 of UTF-8 encoded bytes that represent latin1 string
    const decoded = Buffer.from(value, 'base64');

    // Check if decoded data has valid zlib header (both bytes must be correct)
    if (hasValidZlibHeader(decoded)) {
      // Direct zlib compressed data
      compressedBuffer = decoded;
    } else {
      // Legacy format: base64 of UTF-8 bytes that encode a latin1 string
      // The original binary data was stored as latin1 in a utf8mb4 column,
      // which encoded bytes > 0x7F as UTF-8 multi-byte sequences.
      // TO_BASE64 exported those UTF-8 bytes.
      // We need to: decode base64 -> parse UTF-8 -> interpret char codes as bytes
      const utf8String = decoded.toString('utf8');
      compressedBuffer = Buffer.from(utf8String, 'latin1');
    }
  } else {
    // Unknown format - try latin1 interpretation as fallback
    compressedBuffer = Buffer.from(value, 'latin1');
  }

  const decompressedBuffer = await inflateAsync(compressedBuffer);
  return decompressedBuffer.toString('utf8');
};
