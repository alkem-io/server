import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationNotificationEmailBudgetService } from './conversation.notification.email.budget.service';

const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    if (key === 'notifications.messaging.email.budget.max_per_window')
      return 20;
    if (key === 'notifications.messaging.email.budget.window_seconds')
      return 3600;
    return undefined;
  }),
};

describe('ConversationNotificationEmailBudgetService (sec-server-10)', () => {
  let service: ConversationNotificationEmailBudgetService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationNotificationEmailBudgetService,
        { provide: MESSAGING_REDIS_CLIENT, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfigService },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<ConversationNotificationEmailBudgetService>(
      ConversationNotificationEmailBudgetService
    );
  });

  it('uses a key namespace disjoint from the per-conversation suppression window and the push budget', async () => {
    mockRedis.incr.mockResolvedValue(1);

    await service.isAllowed('user-1');

    const key = mockRedis.incr.mock.calls[0][0] as string;
    expect(key).toMatch(/^msg:notif:email:budget:user-1:\d+$/);
    expect(key.startsWith('msg:notif:email:supp:')).toBe(false);
    expect(key.startsWith('msg:notif:push:budget:')).toBe(false);
  });

  it('is keyed on the recipient ONLY — not per conversation, so spawning fresh conversations cannot reset it', async () => {
    mockRedis.incr.mockResolvedValue(1);

    await service.isAllowed('user-1');
    await service.isAllowed('user-1');

    const [firstKey] = mockRedis.incr.mock.calls[0];
    const [secondKey] = mockRedis.incr.mock.calls[1];
    expect(firstKey).toBe(secondKey);
  });

  it('never lets N parallel calls exceed the configured cap (atomic INCR)', async () => {
    let counter = 0;
    mockRedis.incr.mockImplementation(async () => ++counter);

    const results = await Promise.all(
      Array.from({ length: 30 }, () => service.isAllowed('user-1'))
    );

    expect(results.filter(Boolean).length).toBe(20);
  });

  it('applies the TTL only on the increment that creates the key', async () => {
    mockRedis.incr.mockResolvedValue(1);
    await service.isAllowed('user-1');
    expect(mockRedis.expire).toHaveBeenCalledWith(
      expect.stringContaining('msg:notif:email:budget:user-1:'),
      3600
    );
  });

  it('fails OPEN (allowed) when the store errors', async () => {
    mockRedis.incr.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.isAllowed('user-1');

    expect(result).toBe(true);
  });
});
