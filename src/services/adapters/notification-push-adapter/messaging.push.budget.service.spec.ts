import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagingPushBudgetService } from './messaging.push.budget.service';

const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    if (key === 'notifications.messaging.push.throttle.max_per_minute')
      return 10;
    return undefined;
  }),
};

describe('MessagingPushBudgetService', () => {
  let service: MessagingPushBudgetService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingPushBudgetService,
        { provide: MESSAGING_REDIS_CLIENT, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfigService },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<MessagingPushBudgetService>(
      MessagingPushBudgetService
    );
  });

  it('uses a key namespace disjoint from the shared push:throttle bucket', async () => {
    mockRedis.incr.mockResolvedValue(1);

    await service.isAllowed('user-1');

    const key = mockRedis.incr.mock.calls[0][0] as string;
    expect(key).toMatch(/^msg:notif:push:budget:user-1:\d+$/);
    expect(key.startsWith('push:throttle:')).toBe(false);
  });

  it('never lets N parallel calls exceed the cap (atomic INCR)', async () => {
    let counter = 0;
    mockRedis.incr.mockImplementation(async () => ++counter);

    const results = await Promise.all(
      Array.from({ length: 15 }, () => service.isAllowed('user-1'))
    );

    expect(results.filter(Boolean).length).toBe(10);
  });

  it('applies the TTL only on the increment that creates the key', async () => {
    mockRedis.incr.mockResolvedValue(1);
    await service.isAllowed('user-1');
    expect(mockRedis.expire).toHaveBeenCalledWith(
      expect.stringContaining('msg:notif:push:budget:user-1:'),
      60
    );
  });

  it('fails OPEN (allowed) when the store errors', async () => {
    mockRedis.incr.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.isAllowed('user-1');

    expect(result).toBe(true);
  });
});
