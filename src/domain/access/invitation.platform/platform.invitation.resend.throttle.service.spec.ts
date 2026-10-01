import { createHash } from 'node:crypto';
import { LogContext } from '@common/enums';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { PlatformInvitationResendThrottleService } from './platform.invitation.resend.throttle.service';

const digest = (email: string) =>
  createHash('sha256').update(email).digest('hex');

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

    const allowed = await service.claim('rs-1', 'a@example.com');

    expect(allowed).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      `platform-invitation:resend:rs-1:${digest('a@example.com')}`,
      '1',
      'EX',
      300,
      'NX'
    );
  });

  it('a second claim inside the window is refused', async () => {
    redis.set.mockResolvedValue(null);

    expect(await service.claim('rs-1', 'a@example.com')).toBe(false);
  });

  it('keys the window per role set and address, not per invitation', async () => {
    redis.set.mockResolvedValue('OK');

    await service.claim('rs-1', 'a@example.com');
    await service.claim('rs-1', 'b@example.com');
    await service.claim('rs-2', 'a@example.com');

    const keys = redis.set.mock.calls.map(call => call[0]);
    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).toBe(
      `platform-invitation:resend:rs-1:${digest('a@example.com')}`
    );
  });

  it('shares one window across invitation records for the same address (revoke and re-invite)', async () => {
    redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

    expect(await service.claim('rs-1', 'a@example.com')).toBe(true);
    // A re-created invitation has a new ID but the same (role set, address).
    expect(await service.claim('rs-1', 'a@example.com')).toBe(false);
    expect(redis.set.mock.calls[0][0]).toBe(redis.set.mock.calls[1][0]);
  });

  it('normalizes case and whitespace and never stores the address in the key', async () => {
    redis.set.mockResolvedValue('OK');

    await service.claim('rs-1', '  A@Example.COM ');
    await service.claim('rs-1', 'a@example.com');

    expect(redis.set.mock.calls[0][0]).toBe(redis.set.mock.calls[1][0]);
    expect(redis.set.mock.calls[0][0]).not.toContain('@');
  });

  it('fails open on a Redis error and logs without an address', async () => {
    redis.set.mockRejectedValue(new Error('redis down'));

    const allowed = await service.claim('rs-1', 'a@example.com');

    expect(allowed).toBe(true);
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [payload, , context] = logger.error.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        message:
          'Platform-invitation resend throttle store error — failing open',
        roleSetID: 'rs-1',
      })
    );
    expect(context).toBe(LogContext.ROLES);
    expect(JSON.stringify(payload)).not.toContain('@');
  });
});
