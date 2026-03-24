import { Readable } from 'stream';

export async function streamToBuffer(
  stream: Readable,
  timeoutMs: number
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
