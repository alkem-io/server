import { Agent, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import axios, { AxiosError } from 'axios';
import { firstValueFrom, NEVER, timeout } from 'rxjs';
import { FileServiceAdapterException } from './file.service.adapter.exception';

describe('FileServiceAdapterException transport diagnostics', () => {
  it('retains a real refused socket cause without serializing the request', async () => {
    const server = createServer();
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
    const error = await axios
      .get(`http://127.0.0.1:${port}/private-file`, {
        proxy: false,
        timeout: 1000,
        headers: { Authorization: 'Bearer fixture-private-token' },
      })
      .catch(error => error);
    expect(error).toBeInstanceOf(AxiosError);
    const exception = FileServiceAdapterException.fromTransportError(
      'read',
      error
    );
    expect(exception.details?.transportCause).toMatchObject({
      code: 'ECONNREFUSED',
      cause: { syscall: 'connect', address: '127.0.0.1', port },
    });
    expect(JSON.stringify(exception)).not.toMatch(
      /fixture-private-token|private-file|Authorization|http:\/\//
    );
  });

  it('distinguishes an actual HTTP timeout and closes its owned listener', async () => {
    const server = createServer(() => {});
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const error = await axios
        .get(`http://127.0.0.1:${port}/private-file`, {
          proxy: false,
          timeout: 25,
          headers: { Authorization: 'Bearer fixture-private-token' },
        })
        .catch(error => error);
      expect(error).toBeInstanceOf(AxiosError);
      const exception = FileServiceAdapterException.fromTransportError(
        'read',
        error
      );
      expect(exception.details?.transportCause).toMatchObject({
        code: 'ECONNABORTED',
      });
      expect(JSON.stringify(exception)).not.toMatch(
        /fixture-private-token|private-file|Authorization|http:\/\//
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve()))
      );
    }
  });

  it('retains both real socket failures from Axios address-family fallback', async () => {
    const server = createServer();
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
    const agent = new Agent({
      autoSelectFamily: true,
      lookup: (_hostname, _options, callback) =>
        callback(null, [
          { address: '::1', family: 6 },
          { address: '127.0.0.1', family: 4 },
        ]),
    });
    try {
      const error = await axios
        .get(`http://fixture.invalid:${port}/private-file`, {
          proxy: false,
          timeout: 1000,
          httpAgent: agent,
        })
        .catch(error => error);
      expect(error.cause).toBeInstanceOf(AggregateError);
      const [ipv6, ipv4] = error.cause.errors;
      expect(ipv6).toMatchObject({
        code: expect.stringMatching(/^E[A-Z]+$/),
        address: '::1',
        port,
      });
      expect(ipv4).toMatchObject({
        code: 'ECONNREFUSED',
        address: '127.0.0.1',
        port,
      });
      const exception = FileServiceAdapterException.fromTransportError(
        'read',
        error
      );
      expect(exception.details?.transportCause).toMatchObject({
        cause: {
          errors: [
            { code: ipv6.code, address: '::1', port },
            { code: 'ECONNREFUSED', address: '127.0.0.1', port },
          ],
        },
      });
      expect(JSON.stringify(exception)).not.toContain('private-file');
    } finally {
      agent.destroy();
    }
  });

  it('retains Axios-wrapped refused connection socket details without Axios payloads', async () => {
    const socket = Object.assign(
      new Error('connect ECONNREFUSED 127.0.0.1:4003'),
      {
        code: 'ECONNREFUSED',
        syscall: 'connect',
        errno: -61,
        address: '127.0.0.1',
        port: 4003,
      }
    );
    const error = AxiosError.from(socket, socket.code, {
      url: 'http://secret/secret-scene',
      headers: { Authorization: 'Bearer secret-token' },
    } as any);
    const exception = FileServiceAdapterException.fromTransportError(
      'read',
      error
    );
    expect(exception.message).toBe('File service transport error');
    expect(exception.details).toMatchObject({
      operation: 'read',
      transportCause: {
        code: 'ECONNREFUSED',
        cause: { syscall: 'connect', address: '127.0.0.1', port: 4003 },
      },
    });
    const serialized = JSON.stringify(exception);
    for (const secret of [
      'secret-token',
      'secret-scene',
      'http://',
      'headers',
      'request',
      'config',
    ])
      expect(serialized).not.toContain(secret);
  });

  it('distinguishes Axios timeout and a real RxJS adapter deadline from refusal', async () => {
    const exception = FileServiceAdapterException.fromTransportError(
      'read',
      new AxiosError('timeout', 'ECONNABORTED')
    );
    expect(exception.details?.transportCause).toMatchObject({
      code: 'ECONNABORTED',
    });
    const deadline = await firstValueFrom(NEVER.pipe(timeout(1))).catch(
      error => error
    );
    expect(
      FileServiceAdapterException.fromTransportError('read', deadline).details
        ?.errorName
    ).toBe('TimeoutError');
  });

  it('bounds nested aggregate causes and ignores arbitrary messages and fields', () => {
    const socket = Object.assign(new Error('http://secret/token scene'), {
      code: 'ECONNREFUSED',
      errno: -61,
      syscall: 'connect',
      address: '::1',
      port: 4003,
      request: { token: 'secret' },
    });
    const aggregate = new AggregateError(
      Array(20).fill(socket),
      'secret aggregate'
    );
    const outer = Object.assign(new Error('secret outer'), {
      cause: aggregate,
      headers: { authorization: 'secret' },
    });
    const exception = FileServiceAdapterException.fromTransportError(
      'create',
      outer
    );
    expect(exception.details?.transportCause).toMatchObject({
      cause: {
        errors: [
          { code: 'ECONNREFUSED', errno: -61 },
          expect.anything(),
          expect.anything(),
          expect.anything(),
        ],
      },
    });
    expect(JSON.stringify(exception)).not.toContain('secret');
    (outer as any).cause = outer;
    expect(
      JSON.stringify(
        FileServiceAdapterException.fromTransportError('create', outer)
      ).length
    ).toBeLessThan(2000);
  });
});
