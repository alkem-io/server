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
  type FixtureResponse = {
    status?: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
  const responses: FixtureResponse[] = [];
  const requests: { request: IncomingMessage; body: unknown }[] = [];
  const server = createServer(async (request, response) => {
    const body =
      request.method === 'POST' ? await readJson(request) : undefined;
    requests.push({ request, body });
    const fixture = responses.shift() ?? {};
    response.statusCode = fixture.status ?? 200;
    for (const [name, value] of Object.entries(fixture.headers ?? {}))
      response.setHeader(name, value);
    if (Buffer.isBuffer(fixture.body)) response.end(fixture.body);
    else {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(fixture.body));
    }
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
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
  });

  it('posts exact PDF bytes, B-T, raw state and provider subject without authorization', async () => {
    responses.push({
      body: {
        redirectUrl: 'https://connect.acc.cleverbase.com/authorize',
        correlationId: 'correlation-1',
        expiresAt: '2026-09-05T16:30:00Z',
      },
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
    responses.push({ body: response });

    await expect(
      client.start(Buffer.from('%PDF'), 'PNONL-123', 'raw-state')
    ).rejects.toThrow(/invalid gateway response/i);
  });

  it.each([
    [{ status: 'pending' }, { status: 'pending' }],
    [
      { status: 'failed', reason: 'authorization_expired' },
      { status: 'failed', reason: 'authorization_expired' },
    ],
    [
      { status: 'failed', reason: 'future_failure_reason' },
      { status: 'failed', reason: 'future_failure_reason' },
    ],
    [{ status: 'future_nonterminal' }, { status: 'future_nonterminal' }],
  ])('reads gateway status %# without authorization', async (body, expected) => {
    responses.push({ body });

    await expect(client.getStatus('correlation-1')).resolves.toEqual(expected);
    expect(requests[0].request.method).toBe('GET');
    expect(requests[0].request.url).toBe(
      '/v1/sign/status?correlationId=correlation-1'
    );
    expect(requests[0].request.headers.authorization).toBeUndefined();
  });

  it('maps an evicted gateway correlation to no status', async () => {
    responses.push({ status: 404, body: { error: 'not_found' } });

    await expect(client.getStatus('evicted')).resolves.toBeUndefined();
  });

  it('propagates a status transport failure', async () => {
    responses.push({ status: 500, body: { error: 'unavailable' } });

    await expect(client.getStatus('correlation-1')).rejects.toThrow();
  });

  it('returns exact completed PDF bytes and decoded JSON evidence', async () => {
    const pdf = Buffer.from('%PDF-signed');
    const evidence = { signer: { serial_number: 'ABC', common_name: 'Jane' } };
    responses.push({
      headers: {
        'Content-Type': 'application/pdf',
        'X-Signature-Evidence': Buffer.from(JSON.stringify(evidence)).toString(
          'base64'
        ),
      },
      body: pdf,
    });

    await expect(client.getResult('correlation-1')).resolves.toEqual({
      pdf,
      evidence,
    });
    expect(requests[0].request.url).toBe(
      '/v1/sign/result?correlationId=correlation-1'
    );
    expect(requests[0].request.headers.authorization).toBeUndefined();
  });

  it.each([
    [409, null],
    [404, undefined],
  ])('distinguishes result HTTP %s', async (status, expected) => {
    responses.push({ status, body: { error: 'not_available' } });

    await expect(client.getResult('correlation-1')).resolves.toBe(expected);
  });

  it('propagates a result transport failure', async () => {
    responses.push({ status: 500, body: { error: 'unavailable' } });

    await expect(client.getResult('correlation-1')).rejects.toThrow();
  });

  it.each([
    [Buffer.from('not-pdf'), Buffer.from('{}').toString('base64')],
    [Buffer.from('%PDF-signed'), 'not-base64-json'],
    [Buffer.from('%PDF-signed'), Buffer.from('[]').toString('base64')],
  ])('rejects malformed completed result %#', async (body, evidence) => {
    responses.push({
      headers: {
        'Content-Type': 'application/pdf',
        'X-Signature-Evidence': evidence,
      },
      body,
    });

    await expect(client.getResult('correlation-1')).rejects.toThrow(
      /invalid gateway response/i
    );
  });

  it('does not retry a failed gateway start request', async () => {
    responses.push({ status: 500, body: { error: 'begin_failed' } });

    await expect(
      client.start(Buffer.from('%PDF'), 'PNONL-123', 'raw-state')
    ).rejects.toThrow();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe('POST');
  });
});
