import { LogContext } from '@common/enums';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { PlatformInvitationResendThrottleService } from './platform.invitation.resend.throttle.service';

describe('PlatformInvitationResendThrottleService', () => {
  let service: PlatformInvitationResendThrottleService;
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
        PlatformInvitationResendThrottleService,
        { provide: MESSAGING_REDIS_CLIENT, useValue: redis },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: logger },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue(300) },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformInvitationResendThrottleService);
  });

  it('first claim sets the marker with the window and NX, and allows the resend', async () => {
    redis.set.mockResolvedValue('OK');

    const allowed = await service.claim('inv-1');

    expect(allowed).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      'platform-invitation:resend:inv-1',
      '1',
      'EX',
      300,
      'NX'
    );
  });

  it('a second claim inside the window is refused', async () => {
    redis.set.mockResolvedValue(null);

    expect(await service.claim('inv-1')).toBe(false);
  });

  it('keys the window per invitation', async () => {
    redis.set.mockResolvedValue('OK');

    await service.claim('inv-1');
    await service.claim('inv-2');

    expect(redis.set).toHaveBeenNthCalledWith(
      1,
      'platform-invitation:resend:inv-1',
      '1',
      'EX',
      300,
      'NX'
    );
    expect(redis.set).toHaveBeenNthCalledWith(
      2,
      'platform-invitation:resend:inv-2',
      '1',
      'EX',
      300,
      'NX'
    );
  });

  it('fails open on a Redis error and logs without an address', async () => {
    redis.set.mockRejectedValue(new Error('redis down'));

    const allowed = await service.claim('inv-1');

    expect(allowed).toBe(true);
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [payload, , context] = logger.error.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        message:
          'Platform-invitation resend throttle store error — failing open',
        invitationID: 'inv-1',
      })
    );
    expect(context).toBe(LogContext.ROLES);
    expect(JSON.stringify(payload)).not.toContain('@');
  });
});
