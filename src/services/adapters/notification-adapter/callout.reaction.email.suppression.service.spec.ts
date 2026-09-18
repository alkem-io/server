/**
 * Unit tests for the leading-edge email suppression service.
 *
 * The service issues an atomic SET EX NX command on a per-(recipient, callout)
 * key. Only the first call within the window succeeds (returns 'OK'); subsequent
 * calls return null and map to shouldSendLeadingEmail=false.
 *
 * Any Redis error is caught internally and the method returns true (fail-open)
 * to prevent a cache blip from silently dropping a notification.
 */
import { LogContext } from '@common/enums';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { CalloutReactionEmailSuppressionService } from './callout.reaction.email.suppression.service';

describe('CalloutReactionEmailSuppressionService', () => {
  let service: CalloutReactionEmailSuppressionService;
  let redis: { set: ReturnType<typeof vi.fn> };
  let logger: {
    error: ReturnType<typeof vi.fn>;
    verbose: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    redis = { set: vi.fn() };
    logger = { error: vi.fn(), verbose: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutReactionEmailSuppressionService,
        {
          provide: MESSAGING_REDIS_CLIENT,
          useValue: redis,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: logger,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CalloutReactionEmailSuppressionService>(
      CalloutReactionEmailSuppressionService
    );

    // Config: default window of 300 seconds
    const configService = module.get<ConfigService>(ConfigService);
    vi.mocked(configService.get).mockReturnValue(300 as any);

    // Re-instantiate after config mock so the constructor reads the mocked value
    const mod2: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutReactionEmailSuppressionService,
        {
          provide: MESSAGING_REDIS_CLIENT,
          useValue: redis,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: logger,
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue(300),
          },
        },
      ],
    }).compile();

    service = mod2.get<CalloutReactionEmailSuppressionService>(
      CalloutReactionEmailSuppressionService
    );
  });

  it('first call in a window: SET NX succeeds → returns true', async () => {
    redis.set.mockResolvedValue('OK');

    const result = await service.shouldSendLeadingEmail(
      'recipient-1',
      'callout-1'
    );

    expect(result).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      'notifications:email:suppress:callout-reaction:recipient-1:callout-1',
      '1',
      'EX',
      300,
      'NX'
    );
  });

  it('subsequent call in the same window: SET NX returns null → returns false', async () => {
    redis.set.mockResolvedValue(null);

    const result = await service.shouldSendLeadingEmail(
      'recipient-1',
      'callout-1'
    );

    expect(result).toBe(false);
  });

  it('distinct callout IDs maintain independent windows (R-6)', async () => {
    redis.set
      .mockResolvedValueOnce('OK') // callout-1 window open
      .mockResolvedValueOnce('OK'); // callout-2 has its own key

    const r1 = await service.shouldSendLeadingEmail('recipient-1', 'callout-1');
    const r2 = await service.shouldSendLeadingEmail('recipient-1', 'callout-2');

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(redis.set).toHaveBeenNthCalledWith(
      1,
      'notifications:email:suppress:callout-reaction:recipient-1:callout-1',
      expect.any(String),
      expect.any(String),
      expect.any(Number),
      expect.any(String)
    );
    expect(redis.set).toHaveBeenNthCalledWith(
      2,
      'notifications:email:suppress:callout-reaction:recipient-1:callout-2',
      expect.any(String),
      expect.any(String),
      expect.any(Number),
      expect.any(String)
    );
  });

  it('distinct recipient IDs maintain independent windows (R-6)', async () => {
    redis.set
      .mockResolvedValueOnce(null) // recipient-1 window active for callout-1
      .mockResolvedValueOnce('OK'); // recipient-2 gets its own first email

    const r1 = await service.shouldSendLeadingEmail('recipient-1', 'callout-1');
    const r2 = await service.shouldSendLeadingEmail('recipient-2', 'callout-1');

    expect(r1).toBe(false);
    expect(r2).toBe(true);
  });

  it('Redis error: logs the error and returns true (fail-open, D-10)', async () => {
    redis.set.mockRejectedValue(new Error('Redis connection refused'));

    const result = await service.shouldSendLeadingEmail(
      'recipient-1',
      'callout-1'
    );

    expect(result).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('failing open'),
      }),
      expect.any(String),
      LogContext.NOTIFICATIONS
    );
  });
});
