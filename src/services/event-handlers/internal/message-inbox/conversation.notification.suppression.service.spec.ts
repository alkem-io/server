import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationNotificationSuppressionService } from './conversation.notification.suppression.service';

const mockRedis = {
  set: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    if (key === 'notifications.messaging.email_suppression_window_seconds')
      return 300;
    return undefined;
  }),
};

describe('ConversationNotificationSuppressionService (FR-011/D-8)', () => {
  let service: ConversationNotificationSuppressionService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationNotificationSuppressionService,
        { provide: MESSAGING_REDIS_CLIENT, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfigService },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get(ConversationNotificationSuppressionService);
  });

  it('is NOT suppressed the first time (claims the window atomically)', async () => {
    mockRedis.set.mockResolvedValue('OK');

    const suppressed = await service.isSuppressed('recipient-1', 'conv-1');

    expect(suppressed).toBe(false);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'msg:notif:email:supp:recipient-1:conv-1',
      '1',
      'EX',
      300,
      'NX'
    );
  });

  it('a burst of 5 messages within one window yields suppression on messages 2-5 (US1-AS3)', async () => {
    mockRedis.set
      .mockResolvedValueOnce('OK') // message 1: not suppressed, claims window
      .mockResolvedValueOnce(null) // message 2: suppressed
      .mockResolvedValueOnce(null) // message 3: suppressed
      .mockResolvedValueOnce(null) // message 4: suppressed
      .mockResolvedValueOnce(null); // message 5: suppressed

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        service.isSuppressed('recipient-1', 'conv-1')
      )
    );

    expect(results).toEqual([false, true, true, true, true]);
  });

  it('a new email is sent once the window has elapsed (marker expired -> SET NX succeeds again)', async () => {
    mockRedis.set.mockResolvedValueOnce('OK');
    await service.isSuppressed('recipient-1', 'conv-1');

    // Simulate TTL expiry: SET NX succeeds again.
    mockRedis.set.mockResolvedValueOnce('OK');
    const suppressedAfterExpiry = await service.isSuppressed(
      'recipient-1',
      'conv-1'
    );

    expect(suppressedAfterExpiry).toBe(false);
  });

  it('fails OPEN (not suppressed -> email sent) when the store errors', async () => {
    mockRedis.set.mockRejectedValue(new Error('ECONNREFUSED'));

    const suppressed = await service.isSuppressed('recipient-1', 'conv-1');

    expect(suppressed).toBe(false);
  });

  it('keys are scoped per (recipient, conversation) pair — different conversations are independent', async () => {
    mockRedis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce('OK');

    await service.isSuppressed('recipient-1', 'conv-1');
    await service.isSuppressed('recipient-1', 'conv-2');

    expect(mockRedis.set).toHaveBeenNthCalledWith(
      1,
      'msg:notif:email:supp:recipient-1:conv-1',
      '1',
      'EX',
      300,
      'NX'
    );
    expect(mockRedis.set).toHaveBeenNthCalledWith(
      2,
      'msg:notif:email:supp:recipient-1:conv-2',
      '1',
      'EX',
      300,
      'NX'
    );
  });
});
