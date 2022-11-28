import { inflate, deflate } from 'zlib';
import { promisify } from 'util';

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

interface ICompressionUtil {
  compress(value: string): Promise<string>;
  uncompress(value: string): Promise<string>;
}

// We can't rely on default "utf8" because Buffer#toString() alters strings that aren't valid UTF-8
// as well as we shouldn't use "base64" because it's space-consuming and we're trying to save space here.
const COMPRESSED_STRING_ENCODING = 'binary';

class CompressionUtil implements ICompressionUtil {
  public async compress(value: string): Promise<string> {
    const compressedBuffer = await deflateAsync(value);
    return compressedBuffer.toString(COMPRESSED_STRING_ENCODING);
  }

  public async uncompress(value: string): Promise<string> {
    const compressedBuffer = Buffer.from(value, COMPRESSED_STRING_ENCODING);
    const uncompressedBuffer = await inflateAsync(compressedBuffer);
    return uncompressedBuffer.toString('utf8');
  }
}

export default CompressionUtil;
