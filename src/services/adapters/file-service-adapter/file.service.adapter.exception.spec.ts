import { AxiosError } from 'axios';
import { firstValueFrom, NEVER, timeout } from 'rxjs';
import { FileServiceAdapterException } from './file.service.adapter.exception';

describe('FileServiceAdapterException transport diagnostics', () => {
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
