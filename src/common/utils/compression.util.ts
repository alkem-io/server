import { inflate, deflate } from 'zlib';
import { promisify } from 'util';

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

// We can't rely on default "utf8" because Buffer#toString() alters strings that aren't valid UTF-8
// as well as we shouldn't use "base64" because it's space-consuming and we're trying to save space here.
const COMPRESSED_STRING_ENCODING = 'binary';

export const compressText = async (value: string): Promise<string> => {
  const compressedBuffer = await deflateAsync(value);
  return compressedBuffer.toString(COMPRESSED_STRING_ENCODING);
};

export const decompressText = async (value: string): Promise<string> => {
  const compressedBuffer = Buffer.from(value, COMPRESSED_STRING_ENCODING);
  const decompressedBuffer = await inflateAsync(compressedBuffer);
  return decompressedBuffer.toString('utf8');
};
