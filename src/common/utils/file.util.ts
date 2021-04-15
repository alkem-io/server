import { ReadStream } from 'fs';

export async function streamToBuffer(stream: ReadStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const data: any[] = [];

    stream.on('data', (chunk: any) => {
      data.push(chunk);
    });

    stream.on('end', () => {
      resolve(Buffer.concat(data));
    });

    stream.on('error', (err: any) => {
      reject(err);
    });
  });
}
