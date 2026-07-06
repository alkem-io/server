import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WopiServiceAdapter } from './wopi.service.adapter';

const mockConfigValues: Record<string, any> = {
  'storage.collabora.wopi_service_url': 'http://wopi-service:4000',
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

describe('WopiServiceAdapter', () => {
  let adapter: WopiServiceAdapter;
  let httpService: HttpService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WopiServiceAdapter,
        {
          provide: HttpService,
          useValue: { get: vi.fn(), post: vi.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: vi.fn((key: string) => mockConfigValues[key]) },
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    adapter = module.get<WopiServiceAdapter>(WopiServiceAdapter);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('getLockStatus', () => {
    it('GETs the lock-status endpoint and returns true when locked', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        of(axiosResponse({ locked: true, expiresAt: '2026-07-01T12:00:00Z' }))
      );

      const locked = await adapter.getLockStatus('doc-1');

      expect(locked).toBe(true);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://wopi-service:4000/wopi/files/doc-1/lock-status',
        expect.anything()
      );
    });

    it('returns false when the document is not locked', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        of(axiosResponse({ locked: false }))
      );

      await expect(adapter.getLockStatus('doc-1')).resolves.toBe(false);
    });

    it('FAILS CLOSED (returns true) on a 200 with a malformed body (no boolean `locked`)', async () => {
      vi.mocked(httpService.get).mockReturnValue(of(axiosResponse({})));

      await expect(adapter.getLockStatus('doc-1')).resolves.toBe(true);
    });

    it('FAILS CLOSED (returns true) on an HTTP error', async () => {
      const err = new AxiosError('boom');
      err.response = axiosResponse({}, 500) as any;
      vi.mocked(httpService.get).mockReturnValue(throwError(() => err));

      await expect(adapter.getLockStatus('doc-1')).resolves.toBe(true);
    });

    it('FAILS CLOSED (returns true) on a network/timeout error', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        throwError(() => new Error('ECONNREFUSED'))
      );

      await expect(adapter.getLockStatus('doc-1')).resolves.toBe(true);
    });
  });
});
