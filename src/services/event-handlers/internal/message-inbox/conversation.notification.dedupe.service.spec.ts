import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationNotificationDedupeService } from './conversation.notification.dedupe.service';

const mockRedis = {
  set: vi.fn(),
};

describe('ConversationNotificationDedupeService (FR-013/D-12)', () => {
  let service: ConversationNotificationDedupeService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationNotificationDedupeService,
        { provide: MESSAGING_REDIS_CLIENT, useValue: mockRedis },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get(ConversationNotificationDedupeService);
  });

  it('claims the marker atomically with SET NX + TTL on the message id', async () => {
    mockRedis.set.mockResolvedValue('OK');

    const claimed = await service.claim('message-1');

    expect(claimed).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'msg:notif:dedupe:message-1',
      '1',
      'EX',
      600,
      'NX'
    );
  });

  it('a redelivered (already-claimed) message id yields exactly one dispatch: second claim fails', async () => {
    mockRedis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

    const first = await service.claim('message-1');
    const second = await service.claim('message-1');

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('fails OPEN (claim allowed) when the store errors', async () => {
    mockRedis.set.mockRejectedValue(new Error('ECONNREFUSED'));

    const claimed = await service.claim('message-1');

    expect(claimed).toBe(true);
  });
});
