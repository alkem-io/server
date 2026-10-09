import { createServer, type RequestListener, type Server } from 'node:http';
import { PassThrough, Readable } from 'node:stream';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import type { AlkemioConfig } from '@src/types/alkemio.config';
import axios from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { MatrixMediaUploadClient } from './matrix.media.upload.client';

const metadata = {
  actorID: '11111111-1111-4111-8111-111111111111',
  displayName: 'résumé photo.png',
  mimeType: 'image/png',
  size: 6,
};
const result = { contentUri: 'mxc://matrix.local/media', mediaId: 'media' };
const servers: Server[] = [];

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

async function client(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  const values: Record<string, unknown> = {
    'communications.matrix.adapter_url': `http://127.0.0.1:${address.port}`,
    'communications.matrix.connection_timeout': 2000,
  };
  return new MatrixMediaUploadClient(
    new HttpService(axios.create({ proxy: false })),
    { get: (key: string) => values[key] } as ConfigService<AlkemioConfig, true>
  );
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(server => {
      server.closeAllConnections();
      return new Promise<void>(resolve => server.close(() => resolve()));
    })
  );
});

describe('Matrix media upload over real HTTP', () => {
  it('forwards bytes before input EOF with exact metadata and accepts only completed 201', async () => {
    const arrived = deferred();
    const chunks: Buffer[] = [];
    let observedHeaders: Record<string, unknown> = {};
    const upload = await client((request, response) => {
      observedHeaders = request.headers;
      expect(request.url).toBe('/internal/media/upload');
      request.on('data', chunk => {
        chunks.push(chunk);
        arrived.resolve();
      });
      request.on('end', () => {
        response.writeHead(201, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(result));
      });
    });
    const source = new PassThrough();
    const completed = upload.upload(source, metadata);
    source.write('abc');
    await arrived.promise;
    expect(source.writableEnded).toBe(false);
    source.end('def');
    await expect(completed).resolves.toEqual({ mediaId: result.mediaId });
    expect(Buffer.concat(chunks).toString()).toBe('abcdef');
    expect(observedHeaders).toMatchObject({
      'content-length': '6',
      'content-type': 'image/png',
      'x-alkemio-actor-id': metadata.actorID,
      'x-alkemio-display-name': encodeURIComponent(metadata.displayName),
    });
    expect(source.destroyed).toBe(true);
  });

  it.each([
    200, 503,
  ])('rejects status %s without replaying the stream', async status => {
    let attempts = 0;
    const upload = await client((request, response) => {
      attempts++;
      request.resume();
      request.on('end', () => {
        response.writeHead(status, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(result));
      });
    });
    await expect(
      upload.upload(Readable.from(['abcdef']), metadata)
    ).rejects.toThrow('Attachment upload could not be completed');
    expect(attempts).toBe(1);
  });

  it.each([
    'source failure',
    'cancellation',
  ] as const)('aborts an active request after %s without retry', async failure => {
    const arrived = deferred();
    let attempts = 0;
    let downstreamAborted = false;
    const upload = await client(request => {
      attempts++;
      request.on('aborted', () => {
        downstreamAborted = true;
      });
      request.on('data', () => arrived.resolve());
    });
    const source = new PassThrough();
    const controller = new AbortController();
    const rejected = expect(
      upload.upload(source, metadata, controller.signal)
    ).rejects.toThrow('Attachment upload could not be completed');
    source.write('abc');
    await arrived.promise;
    if (failure === 'source failure')
      source.destroy(new Error('source failed'));
    else controller.abort();
    await rejected;
    await expect.poll(() => downstreamAborted).toBe(true);
    expect(attempts).toBe(1);
    expect(source.destroyed).toBe(true);
  });
});
