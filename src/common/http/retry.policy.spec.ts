import { AxiosError, AxiosHeaders } from 'axios';
import { TimeoutError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import type { HttpMethod } from './http.client.base';
import { classifyError, isRetriable } from './retry.policy';

const axiosWithStatus = (status: number): AxiosError =>
  new AxiosError(`status ${status}`, String(status), undefined, null, {
    status,
    data: null,
    statusText: `status ${status}`,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const axiosTransport = (code: string): AxiosError => {
  const err = new AxiosError('transport', code);
  err.code = code;
  // no `.response` — simulates a real transport failure
  return err;
};

describe('classifyError', () => {
  it.each([
    [400, 'http-4xx'],
    [401, 'http-4xx'],
    [404, 'http-4xx'],
    [409, 'http-4xx'],
    [500, 'http-5xx-other'],
    [501, 'http-5xx-other'],
    [502, 'http-5xx-other'],
    [503, 'http-503'],
    [504, 'http-504'],
    [505, 'http-5xx-other'],
  ] as const)('classifies axios response status %i as %s', (status, expected) => {
    expect(classifyError(axiosWithStatus(status))).toBe(expected);
  });

  it.each([
    ['ECONNREFUSED', 'pre-send-transport'],
    ['ENOTFOUND', 'pre-send-transport'],
    ['EAI_AGAIN', 'pre-send-transport'],
    ['EHOSTUNREACH', 'pre-send-transport'],
    ['ENETUNREACH', 'pre-send-transport'],
    ['ECONNRESET', 'post-send-transport'],
    ['ECONNABORTED', 'post-send-transport'],
    ['ETIMEDOUT', 'post-send-transport'],
    ['SOMETHING_ELSE', 'post-send-transport'],
  ] as const)('classifies axios transport code %s as %s', (code, expected) => {
    expect(classifyError(axiosTransport(code))).toBe(expected);
  });

  it('classifies RxJS TimeoutError as rxjs-timeout', () => {
    expect(classifyError(new TimeoutError())).toBe('rxjs-timeout');
  });

  it('classifies a plain Error as other', () => {
    expect(classifyError(new Error('boom'))).toBe('other');
  });
});

describe('isRetriable', () => {
  // Idempotent methods retry on any retriable class.
  // POST only retries when we know the request didn't reach the server
  // (pre-send-transport, 504) or the server invites retry (503).
  const expectations: Array<{
    cls: Parameters<typeof isRetriable>[0];
    retriable: Record<HttpMethod, boolean>;
  }> = [
    {
      cls: 'http-4xx',
      retriable: {
        get: false,
        post: false,
        put: false,
        patch: false,
        delete: false,
      },
    },
    {
      cls: 'http-503',
      retriable: {
        get: true,
        post: true,
        put: true,
        patch: true,
        delete: true,
      },
    },
    {
      cls: 'http-504',
      retriable: {
        get: true,
        post: true,
        put: true,
        patch: true,
        delete: true,
      },
    },
    {
      cls: 'pre-send-transport',
      retriable: {
        get: true,
        post: true,
        put: true,
        patch: true,
        delete: true,
      },
    },
    {
      cls: 'http-5xx-other',
      retriable: {
        get: true,
        post: false,
        put: true,
        patch: true,
        delete: true,
      },
    },
    {
      cls: 'post-send-transport',
      retriable: {
        get: true,
        post: false,
        put: true,
        patch: true,
        delete: true,
      },
    },
    {
      cls: 'rxjs-timeout',
      retriable: {
        get: true,
        post: false,
        put: true,
        patch: true,
        delete: true,
      },
    },
    {
      cls: 'other',
      retriable: {
        get: true,
        post: false,
        put: true,
        patch: true,
        delete: true,
      },
    },
  ];

  for (const { cls, retriable } of expectations) {
    describe(`class=${cls}`, () => {
      for (const [method, expected] of Object.entries(retriable) as Array<
        [HttpMethod, boolean]
      >) {
        it(`${method.toUpperCase()} → ${expected}`, () => {
          expect(isRetriable(cls, method)).toBe(expected);
        });
      }
    });
  }
});
