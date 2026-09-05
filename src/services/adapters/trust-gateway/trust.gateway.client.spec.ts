import { createServer, type IncomingMessage } from 'node:http';
import { AddressInfo } from 'node:net';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { TrustGatewayClient } from './trust.gateway.client';

const readJson = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
};

describe('TrustGatewayClient', () => {
  const responses: unknown[] = [];
  const requests: { request: IncomingMessage; body: unknown }[] = [];
  let responseStatus = 200;
  const server = createServer(async (request, response) => {
    requests.push({ request, body: await readJson(request) });
    response.statusCode = responseStatus;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(responses.shift()));
  });
  let client: TrustGatewayClient;

  beforeAll(async () => {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    client = new TrustGatewayClient(
      { get: () => ({ url: `http://127.0.0.1:${port}` }) } as any,
      new HttpService(axios.create())
    );
  });

  beforeEach(() => {
    responses.length = 0;
    requests.length = 0;
    responseStatus = 200;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
  });

  it('posts exact PDF bytes, B-T, raw state and provider subject without authorization', async () => {
    responses.push({
      redirectUrl: 'https://connect.acc.cleverbase.com/authorize',
      correlationId: 'correlation-1',
      expiresAt: '2026-09-05T16:30:00Z',
    });

    await expect(
      client.start(Buffer.from('%PDF-exact'), 'PNONL-123', 'raw-client-state')
    ).resolves.toEqual({
      redirectUrl: 'https://connect.acc.cleverbase.com/authorize',
      correlationId: 'correlation-1',
      expiresAt: new Date('2026-09-05T16:30:00Z'),
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe('POST');
    expect(requests[0].request.url).toBe('/v1/sign/start');
    expect(requests[0].request.headers.authorization).toBeUndefined();
    expect(requests[0].body).toEqual({
      document: Buffer.from('%PDF-exact').toString('base64'),
      conformanceLevel: 'B-T',
      expectedSigner: {
        matchOn: 'cleverbase_subject',
        value: 'PNONL-123',
      },
      clientState: 'raw-client-state',
    });
  });

  it.each([
    {},
    {
      redirectUrl: 'https://connect.acc.cleverbase.com/authorize',
      correlationId: 'correlation-1',
    },
    {
      redirectUrl: 'javascript:alert(1)',
      correlationId: 'correlation-1',
      expiresAt: '2026-09-05T16:30:00Z',
    },
    {
      redirectUrl: 'https://connect.acc.cleverbase.com/authorize',
      correlationId: '',
      expiresAt: '2026-09-05T16:30:00Z',
    },
    {
      redirectUrl: 'not a URL',
      correlationId: 'correlation-1',
      expiresAt: '2026-09-05T16:30:00Z',
    },
    {
      redirectUrl: 'https://connect.acc.cleverbase.com/authorize',
      correlationId: 'correlation-1',
      expiresAt: 'not-a-date',
    },
    {
      redirectUrl: 'https://connect.acc.cleverbase.com/authorize',
      correlationId: 'correlation-1',
      expiresAt: '2026-13-05T16:30:00Z',
    },
  ])('rejects malformed start response %# without exposing it', async response => {
    responses.push(response);

    await expect(
      client.start(Buffer.from('%PDF'), 'PNONL-123', 'raw-state')
    ).rejects.toThrow(/invalid gateway response/i);
  });

  it('does not retry a failed gateway start request', async () => {
    responseStatus = 500;
    responses.push({ error: 'begin_failed' });

    await expect(
      client.start(Buffer.from('%PDF'), 'PNONL-123', 'raw-state')
    ).rejects.toThrow();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe('POST');
  });
});
