import { Readable } from 'stream';

const DEFAULT_STREAM_TIMEOUT_MS = 60_000;

export async function streamToBuffer(
  stream: Readable,
  timeoutMs: number = DEFAULT_STREAM_TIMEOUT_MS
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const data: any[] = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        stream.destroy();
        reject(new Error(`Stream read timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    stream.on('data', (chunk: any) => {
      data.push(chunk);
    });

    stream.on('end', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(Buffer.concat(data));
      }
    });

    stream.on('error', (err: any) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}
