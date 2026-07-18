import { LogContext } from '@common/enums';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { defer, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { FileServiceAdapter } from './file.service.adapter';
import {
  FileServiceAdapterException,
  StorageServiceUnavailableException,
} from './file.service.adapter.exception';

const mockConfigValues: Record<string, any> = {
  'storage.file_service.url': 'http://file-service:4003',
  'storage.file_service.timeout': 30000,
  'storage.file_service.retries': 2,
  'storage.file_service.enabled': true,
};

const mockLogger = {
  verbose: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const axiosResponse = <T>(data: T, status = 200): AxiosResponse<T> => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: { headers: new AxiosHeaders() },
});

describe('FileServiceAdapter', () => {
  let adapter: FileServiceAdapter;
  let httpService: HttpService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileServiceAdapter,
        {
          provide: HttpService,
          useValue: {
            request: vi.fn(),
            get: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => mockConfigValues[key]),
          },
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    adapter = module.get<FileServiceAdapter>(FileServiceAdapter);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('createDocument', () => {
    it('should POST multipart form data to /internal/file', async () => {
      const responseData = {
        id: 'doc-1',
        externalID: 'hash-123',
        mimeType: 'image/png',
        size: 1024,
      };

      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse(responseData, 201))
      );

      const result = await adapter.createDocument(Buffer.from('file-data'), {
        displayName: 'avatar.png',
        storageBucketId: 'bucket-1',
        authorizationId: 'auth-1',
        tagsetId: 'tagset-1',
        createdBy: 'user-1',
        temporaryLocation: false,
        allowedMimeTypes: 'image/png,image/jpeg',
        maxFileSize: 5000000,
      });

      expect(result).toEqual(responseData);
      expect(httpService.request).toHaveBeenCalledTimes(1);

      const callArgs = (httpService.request as Mock).mock.calls[0][0];
      expect(callArgs.method).toBe('post');
      expect(callArgs.url).toBe('http://file-service:4003/internal/file');
    });

    it('sends skipDedup=true as a multipart form field when set', async () => {
      const responseData = {
        id: 'doc-skip',
        externalID: 'ext-skip',
        mimeType: 'image/png',
        size: 0,
        reused: false,
      };

      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse(responseData, 201))
      );

      await adapter.createDocument(Buffer.alloc(0), {
        displayName: 'placeholder.docx',
        storageBucketId: 'bucket-1',
        authorizationId: 'auth-1',
        tagsetId: 'tagset-1',
        skipDedup: true,
      });

      // FormData carries the field as a serialized stream; assert via the
      // serialized buffer rather than introspection.
      const callArgs = (httpService.request as Mock).mock.calls[0][0];
      const serialized = callArgs.data.getBuffer().toString('utf8');
      expect(serialized).toContain('name="skipDedup"');
      expect(serialized).toMatch(/name="skipDedup"\r\n\r\ntrue/);
    });

    it('omits skipDedup when not set (preserves dedup default)', async () => {
      const responseData = {
        id: 'doc-default',
        externalID: 'ext-default',
        mimeType: 'image/png',
        size: 4,
        reused: false,
      };

      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse(responseData, 201))
      );

      await adapter.createDocument(Buffer.from('data'), {
        displayName: 'avatar.png',
        storageBucketId: 'bucket-1',
        authorizationId: 'auth-1',
      });

      const callArgs = (httpService.request as Mock).mock.calls[0][0];
      const serialized = callArgs.data.getBuffer().toString('utf8');
      expect(serialized).not.toContain('name="skipDedup"');
    });

    it('should throw FileServiceAdapterException on 4xx error', async () => {
      const axiosError = new AxiosError('Bad Request', '400', undefined, null, {
        status: 400,
        data: { error: 'bad request' },
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      (httpService.request as Mock).mockReturnValue(
        throwError(() => axiosError)
      );

      await expect(
        adapter.createDocument(Buffer.from('data'), {
          displayName: 'test.png',
          storageBucketId: 'bucket-1',
          authorizationId: 'auth-1',
        })
      ).rejects.toThrow(FileServiceAdapterException);
    });

    it('does NOT retry POST on 5xx (non-idempotent; server may have processed)', async () => {
      const axiosError = new AxiosError(
        'Internal Server Error',
        '500',
        undefined,
        null,
        {
          status: 500,
          data: { error: 'internal' },
          statusText: 'Internal Server Error',
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
      );

      let subscribeCount = 0;
      (httpService.request as Mock).mockReturnValue(
        defer(() => {
          subscribeCount += 1;
          return throwError(() => axiosError);
        })
      );

      await expect(
        adapter.createDocument(Buffer.from('data'), {
          displayName: 'test.png',
          storageBucketId: 'bucket-1',
          authorizationId: 'auth-1',
        })
      ).rejects.toThrow(FileServiceAdapterException);

      // No retries — exactly one attempt.
      expect(subscribeCount).toBe(1);
    });

    it('DOES retry POST on 503 (server explicitly invites retry)', async () => {
      const axiosError = new AxiosError(
        'Service Unavailable',
        '503',
        undefined,
        null,
        {
          status: 503,
          data: {},
          statusText: 'Service Unavailable',
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
      );

      let subscribeCount = 0;
      (httpService.request as Mock).mockReturnValue(
        defer(() => {
          subscribeCount += 1;
          return throwError(() => axiosError);
        })
      );

      await expect(
        adapter.createDocument(Buffer.from('data'), {
          displayName: 'test.png',
          storageBucketId: 'bucket-1',
          authorizationId: 'auth-1',
        })
      ).rejects.toThrow(StorageServiceUnavailableException);

      // retries: 2 → 1 initial + 2 retries = 3 subscription attempts
      expect(subscribeCount).toBe(3);
    });

    it('DOES retry POST on pre-send transport error (request never reached server)', async () => {
      const transportError = new AxiosError('refused', 'ECONNREFUSED');
      transportError.code = 'ECONNREFUSED';
      // Real connection-refused failures happen after Axios has tried to
      // issue the request, so `.request` is set; classifyError needs
      // that signal to distinguish from pre-request config errors.
      (transportError as AxiosError & { request: unknown }).request = {};

      let subscribeCount = 0;
      (httpService.request as Mock).mockReturnValue(
        defer(() => {
          subscribeCount += 1;
          return throwError(() => transportError);
        })
      );

      await expect(
        adapter.createDocument(Buffer.from('data'), {
          displayName: 'test.png',
          storageBucketId: 'bucket-1',
          authorizationId: 'auth-1',
        })
      ).rejects.toThrow(FileServiceAdapterException);

      expect(subscribeCount).toBe(3);
    });
  });

  describe('copyDocument', () => {
    it('POSTs JSON body to /internal/file/copy', async () => {
      const responseData = {
        id: 'doc-copy',
        externalID: 'ext-shared',
        mimeType: 'image/png',
        size: 1024,
        reused: false,
      };

      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse(responseData, 201))
      );

      const result = await adapter.copyDocument({
        sourceId: 'src-1',
        destinationBucketId: 'bucket-2',
        authorizationId: 'auth-2',
        tagsetId: 'tagset-2',
        createdBy: 'user-1',
      });

      expect(result).toEqual(responseData);

      const callArgs = (httpService.request as Mock).mock.calls[0][0];
      expect(callArgs.method).toBe('post');
      expect(callArgs.url).toBe('http://file-service:4003/internal/file/copy');
      expect(callArgs.data).toEqual({
        sourceId: 'src-1',
        destinationBucketId: 'bucket-2',
        authorizationId: 'auth-2',
        tagsetId: 'tagset-2',
        createdBy: 'user-1',
      });
    });

    it('passes skipDedup when true', async () => {
      (httpService.request as Mock).mockReturnValue(
        of(
          axiosResponse(
            {
              id: 'doc-copy',
              externalID: 'ext',
              mimeType: 'image/png',
              size: 1,
              reused: false,
            },
            201
          )
        )
      );

      await adapter.copyDocument({
        sourceId: 'src-1',
        destinationBucketId: 'bucket-2',
        authorizationId: 'auth-2',
        skipDedup: true,
      });

      const callArgs = (httpService.request as Mock).mock.calls[0][0];
      expect(callArgs.data.skipDedup).toBe(true);
    });

    it('surfaces 404 from file-service-go as FileServiceAdapterException', async () => {
      const axiosError = new AxiosError('Not Found', '404', undefined, null, {
        status: 404,
        data: { error: 'source document not found' },
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      (httpService.request as Mock).mockReturnValue(
        throwError(() => axiosError)
      );

      await expect(
        adapter.copyDocument({
          sourceId: 'missing',
          destinationBucketId: 'bucket-2',
          authorizationId: 'auth-2',
        })
      ).rejects.toThrow(FileServiceAdapterException);
    });
  });

  describe('deleteDocument', () => {
    it('should DELETE and return authorizationId and tagsetId', async () => {
      const responseData = {
        authorizationId: 'auth-1',
        tagsetId: 'tagset-1',
      };

      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse(responseData))
      );

      const result = await adapter.deleteDocument('doc-1');

      expect(result).toEqual(responseData);
      const callArgs = (httpService.request as Mock).mock.calls[0][0];
      expect(callArgs.method).toBe('delete');
      expect(callArgs.url).toBe('http://file-service:4003/internal/file/doc-1');
    });
  });

  describe('updateDocument', () => {
    it('should PATCH with storageBucketId and temporaryLocation', async () => {
      const responseData = {
        id: 'doc-1',
        storageBucketId: 'bucket-2',
        temporaryLocation: false,
      };

      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse(responseData))
      );

      const result = await adapter.updateDocument('doc-1', {
        storageBucketId: 'bucket-2',
        temporaryLocation: false,
      });

      expect(result).toEqual(responseData);
      const callArgs = (httpService.request as Mock).mock.calls[0][0];
      expect(callArgs.method).toBe('patch');
      expect(callArgs.url).toBe('http://file-service:4003/internal/file/doc-1');
      expect(callArgs.data).toEqual({
        storageBucketId: 'bucket-2',
        temporaryLocation: false,
      });
    });
  });

  describe('getDocumentByReference', () => {
    it('[1] issues a GET with ref+bucketId as QUERY params and NO request body', async () => {
      const responseData = {
        id: 'doc-ref',
        externalID: 'media-1',
        mimeType: 'image/png',
        size: 2048,
        storageBucketId: 'bucket-1',
      };
      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse(responseData))
      );

      const result = await adapter.getDocumentByReference(
        'media-1',
        'bucket-1'
      );

      expect(result).toEqual(responseData);
      const callArgs = (httpService.request as Mock).mock.calls[0][0];
      expect(callArgs.method).toBe('get');
      // ref + bucketId travel as query params in the URL...
      expect(callArgs.url).toBe(
        'http://file-service:4003/internal/file/by-reference?ref=media-1&bucketId=bucket-1'
      );
      // ...and NOT as a request body: a GET must carry no data (the misplaced
      // 4th positional arg previously put {ref,bucketId} here).
      expect(callArgs.data).toBeUndefined();
    });

    it('[1] global lookup (no bucketId) sends ref-only query and no body', async () => {
      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse({ id: 'doc-ref', externalID: 'media-1' }))
      );

      await adapter.getDocumentByReference('media-1');

      const callArgs = (httpService.request as Mock).mock.calls[0][0];
      expect(callArgs.url).toBe(
        'http://file-service:4003/internal/file/by-reference?ref=media-1'
      );
      expect(callArgs.data).toBeUndefined();
    });

    it('returns null on 404 (no match) rather than throwing', async () => {
      const axiosError = new AxiosError('Not Found', '404', undefined, null, {
        status: 404,
        data: { error: 'not found' },
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });
      (httpService.request as Mock).mockReturnValue(
        throwError(() => axiosError)
      );

      await expect(
        adapter.getDocumentByReference('media-1', 'bucket-1')
      ).resolves.toBeNull();
    });

    it('[1] a non-404 failure surfaces an error whose context carries ref + bucketId', async () => {
      // 400 is never retried (http-4xx), so this asserts immediately without the
      // idempotent-GET retry timers a 5xx would incur.
      const axiosError = new AxiosError('Bad Request', '400', undefined, null, {
        status: 400,
        data: { error: 'bad request' },
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });
      (httpService.request as Mock).mockReturnValue(
        throwError(() => axiosError)
      );

      const error = await adapter
        .getDocumentByReference('media-1', 'bucket-1')
        .catch(e => e);

      expect(error).toBeInstanceOf(FileServiceAdapterException);
      // The context (6th) arg reaches handleError → the exception details, so a
      // failure stays diagnosable with the reference that triggered it.
      expect(error.details).toMatchObject({
        ref: 'media-1',
        bucketId: 'bucket-1',
      });
    });
  });

  describe('getDocumentMeta (best-effort, isolated from the shared breaker)', () => {
    it('issues a DIRECT GET with the SHORT timeout — bypassing sendRequest/the breaker — and returns the metadata incl. image dimensions', async () => {
      const responseData = {
        id: 'doc-1',
        externalID: 'hash-123',
        mimeType: 'image/png',
        size: 1024,
        storageBucketId: 'bucket-1',
        imageWidth: 640,
        imageHeight: 480,
      };

      (httpService.get as Mock).mockReturnValue(
        of(axiosResponse(responseData))
      );

      const result = await adapter.getDocumentMeta('doc-1');

      expect(result).toEqual(responseData);
      // Direct httpService.get (NOT the breaker-routed request pipeline).
      expect(httpService.request).not.toHaveBeenCalled();
      const [url, options] = (httpService.get as Mock).mock.calls[0];
      expect(url).toBe('http://file-service:4003/internal/file/doc-1/meta');
      // SHORT per-call timeout (DOCUMENT_META_TIMEOUT_MS), no retries config.
      expect(options).toEqual({ timeout: 2500 });
    });

    it('returns null on 404 (unknown document) rather than throwing — QUIETLY, without logging', async () => {
      const axiosError = new AxiosError('Not Found', '404', undefined, null, {
        status: 404,
        data: { error: 'document not found' },
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      (httpService.get as Mock).mockReturnValue(throwError(() => axiosError));
      mockLogger.warn.mockClear();

      await expect(adapter.getDocumentMeta('missing')).resolves.toBeNull();
      // A benign 404 is expected on this best-effort path — no warn (would spam).
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('swallows EVERY failure (5xx / timeout / network) to null — never propagates — and logs a WARN so dropped dims are observable', async () => {
      const failures = [
        // 5xx
        new AxiosError('Boom', '500', undefined, null, {
          status: 500,
          data: { error: 'internal' },
          statusText: 'Internal Server Error',
          headers: {},
          config: { headers: new AxiosHeaders() },
        }),
        // timeout
        Object.assign(
          new AxiosError('timeout of 2500ms exceeded', 'ECONNABORTED'),
          {
            code: 'ECONNABORTED',
          }
        ),
        // network (no response)
        Object.assign(new AxiosError('socket hang up', 'ECONNRESET'), {
          code: 'ECONNRESET',
        }),
      ];

      for (const err of failures) {
        (httpService.get as Mock).mockReturnValue(throwError(() => err));
        mockLogger.warn.mockClear();

        await expect(adapter.getDocumentMeta('doc-1')).resolves.toBeNull();

        // Non-404 degradation → exactly one WARN carrying the documentId + the
        // error message, and the STORAGE_BUCKET context the adapter's other
        // logs use.
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        const [payload, context] = mockLogger.warn.mock.calls[0];
        expect(payload).toMatchObject({
          message: expect.stringContaining(
            'Best-effort document meta lookup failed'
          ),
          documentId: 'doc-1',
          error: err.message,
        });
        expect(context).toBe(LogContext.STORAGE_BUCKET);
      }
    });

    it('does NOT gate on the shared circuit breaker — still fetches even when the breaker is OPEN', async () => {
      // Trip the SHARED breaker via 5 failing breaker-guarded requests (503 is
      // retriable + counted). One breaker failure per completed request.
      const err503 = new AxiosError(
        'Service Unavailable',
        '503',
        undefined,
        null,
        {
          status: 503,
          data: {},
          statusText: 'Service Unavailable',
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
      );
      (httpService.request as Mock).mockReturnValue(throwError(() => err503));
      for (let i = 0; i < 5; i++) {
        await adapter.deleteDocument(`doc-${i}`).catch(() => undefined);
      }
      // Sanity: the breaker is now OPEN — a guarded call short-circuits (no HTTP).
      (httpService.request as Mock).mockClear();
      await expect(adapter.deleteDocument('guarded')).rejects.toThrow(
        StorageServiceUnavailableException
      );
      expect(httpService.request).not.toHaveBeenCalled();

      // getDocumentMeta ignores the open breaker: it STILL issues its direct GET
      // and returns dims (never throws the open-circuit exception).
      (httpService.get as Mock).mockReturnValue(
        of(
          axiosResponse({
            id: 'doc-1',
            externalID: 'ext',
            mimeType: 'image/png',
            size: 1,
            storageBucketId: 'bucket-1',
            imageWidth: 4,
            imageHeight: 2,
          })
        )
      );
      const result = await adapter.getDocumentMeta('doc-1');
      expect(result).toMatchObject({ imageWidth: 4, imageHeight: 2 });
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    it('failing meta fetches never trip the shared breaker guarding uploads/pins', async () => {
      const err500 = new AxiosError('Boom', '500', undefined, null, {
        status: 500,
        data: { error: 'internal' },
        statusText: 'Internal Server Error',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });
      (httpService.get as Mock).mockReturnValue(throwError(() => err500));

      // Ten failed meta fetches — far past the breaker threshold if they counted.
      for (let i = 0; i < 10; i++) {
        await expect(adapter.getDocumentMeta(`doc-${i}`)).resolves.toBeNull();
      }

      // The shared breaker is still CLOSED: a guarded delete reaches the network,
      // not short-circuited.
      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse({ authorizationId: 'a', tagsetId: 't' }))
      );
      await adapter.deleteDocument('doc-x');
      expect(httpService.request).toHaveBeenCalledTimes(1);
    });

    it('returns null when the adapter is disabled (best-effort, does not throw)', async () => {
      const disabledModule = await Test.createTestingModule({
        providers: [
          FileServiceAdapter,
          {
            provide: HttpService,
            useValue: { request: vi.fn(), get: vi.fn() },
          },
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string) =>
                key === 'storage.file_service.enabled'
                  ? false
                  : mockConfigValues[key]
              ),
            },
          },
          {
            provide: WINSTON_MODULE_NEST_PROVIDER,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const disabledAdapter =
        disabledModule.get<FileServiceAdapter>(FileServiceAdapter);
      const disabledHttp = disabledModule.get<HttpService>(HttpService);

      await expect(
        disabledAdapter.getDocumentMeta('doc-1')
      ).resolves.toBeNull();
      // No HTTP attempted when disabled.
      expect(disabledHttp.get).not.toHaveBeenCalled();
    });
  });

  describe('getDocumentContent', () => {
    it('should GET binary content and return Buffer', async () => {
      const fileContent = Buffer.from('file-binary-data');

      (httpService.request as Mock).mockReturnValue(
        of(axiosResponse(fileContent))
      );

      const result = await adapter.getDocumentContent('doc-1');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          url: 'http://file-service:4003/internal/file/doc-1/content',
          responseType: 'arraybuffer',
        })
      );
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after 5 consecutive failures', async () => {
      const axiosError = new AxiosError(
        'Service Unavailable',
        '503',
        undefined,
        null,
        {
          status: 503,
          data: {},
          statusText: 'Service Unavailable',
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
      );

      (httpService.request as Mock).mockReturnValue(
        throwError(() => axiosError)
      );

      // Circuit breaker counts one failure per completed request (after its
      // retries are exhausted), not per HTTP attempt. 5 failed requests →
      // 5 failures → breaker opens at threshold.
      for (let i = 0; i < 5; i++) {
        try {
          await adapter.deleteDocument(`doc-${i}`);
        } catch {
          // expected
        }
      }

      // Next call should throw immediately without HTTP call
      await expect(adapter.deleteDocument('doc-next')).rejects.toThrow(
        StorageServiceUnavailableException
      );
    });

    it('does NOT count non-retriable POST 5xx toward the breaker', async () => {
      // 5xx that we don't retry (POST non-idempotent) also shouldn't
      // count toward circuit-breaker health. Otherwise a burst of
      // content-rejection errors for which retry wouldn't help would
      // trip the breaker and then block unrelated, valid requests.
      const axiosError = new AxiosError(
        'Internal Server Error',
        '500',
        undefined,
        null,
        {
          status: 500,
          data: { error: 'rejected' },
          statusText: 'Internal Server Error',
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
      );
      (httpService.request as Mock).mockReturnValue(
        throwError(() => axiosError)
      );

      for (let i = 0; i < 10; i++) {
        await adapter
          .createDocument(Buffer.from('data'), {
            displayName: `file-${i}.bin`,
            storageBucketId: 'bucket-1',
            authorizationId: 'auth-1',
          })
          .catch(() => undefined);
      }

      // After 10 POST 500s the breaker should still be closed; a fresh
      // call is attempted, not short-circuited.
      (httpService.request as Mock).mockClear();
      (httpService.request as Mock).mockReturnValue(
        of(
          axiosResponse({
            id: 'doc-next',
            externalID: 'ext',
            mimeType: 'image/png',
            size: 4,
          })
        )
      );
      await adapter.createDocument(Buffer.from('next'), {
        displayName: 'ok.png',
        storageBucketId: 'bucket-1',
        authorizationId: 'auth-1',
      });
      expect(httpService.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled adapter', () => {
    it('should throw StorageServiceUnavailableException when disabled', async () => {
      // Create adapter with enabled=false
      const disabledModule = await Test.createTestingModule({
        providers: [
          FileServiceAdapter,
          {
            provide: HttpService,
            useValue: { request: vi.fn(), get: vi.fn() },
          },
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string) =>
                key === 'storage.file_service.enabled'
                  ? false
                  : mockConfigValues[key]
              ),
            },
          },
          {
            provide: WINSTON_MODULE_NEST_PROVIDER,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const disabledAdapter =
        disabledModule.get<FileServiceAdapter>(FileServiceAdapter);

      await expect(disabledAdapter.deleteDocument('doc-1')).rejects.toThrow(
        StorageServiceUnavailableException
      );
    });
  });
});
