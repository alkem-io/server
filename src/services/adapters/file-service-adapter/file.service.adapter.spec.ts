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
      ).rejects.toThrow();

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
      ).rejects.toThrow();

      // retries: 2 → 1 initial + 2 retries = 3 subscription attempts
      expect(subscribeCount).toBe(3);
    });

    it('DOES retry POST on pre-send transport error (request never reached server)', async () => {
      const transportError = new AxiosError('refused', 'ECONNREFUSED');
      transportError.code = 'ECONNREFUSED';

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
      ).rejects.toThrow();

      expect(subscribeCount).toBe(3);
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
