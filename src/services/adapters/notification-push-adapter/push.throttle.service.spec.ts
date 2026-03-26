import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PushThrottleService } from './push.throttle.service';

const mockCacheManager = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    if (key === 'notifications.push.throttle.max_per_minute') return 10;
    return undefined;
  }),
};

describe('PushThrottleService', () => {
  let service: PushThrottleService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushThrottleService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<PushThrottleService>(PushThrottleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAllowed', () => {
    it('should return true when counter is below max', async () => {
      mockCacheManager.get.mockResolvedValue(5);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'push:throttle:user-1',
        6,
        { ttl: 60 }
      );
    });

    it('should return true when no existing counter (first notification)', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'push:throttle:user-1',
        1,
        { ttl: 60 }
      );
    });

    it('should return false when counter equals max', async () => {
      mockCacheManager.get.mockResolvedValue(10);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(false);
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should return false when counter exceeds max', async () => {
      mockCacheManager.get.mockResolvedValue(15);

      const result = await service.isAllowed('user-1');

      expect(result).toBe(false);
    });

    it('should use correct key pattern for user', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      await service.isAllowed('user-abc-123');

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'push:throttle:user-abc-123'
      );
    });
  });
});
