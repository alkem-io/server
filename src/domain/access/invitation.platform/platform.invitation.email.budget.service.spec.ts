import { LogContext } from '@common/enums';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { PlatformInvitationEmailBudgetService } from './platform.invitation.email.budget.service';

describe('PlatformInvitationEmailBudgetService', () => {
  let service: PlatformInvitationEmailBudgetService;
  let redis: { eval: ReturnType<typeof vi.fn> };
  let logger: { error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.restoreAllMocks();
    redis = { eval: vi.fn() };
    logger = { error: vi.fn() };
    const config: Record<string, number> = {
      'notifications.platform_invitations.email_budget_per_actor_per_hour': 200,
      'notifications.platform_invitations.email_budget_per_role_set_per_hour': 300,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformInvitationEmailBudgetService,
        { provide: MESSAGING_REDIS_CLIENT, useValue: redis },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: logger },
        {
          provide: ConfigService,
          useValue: { get: vi.fn((key: string) => config[key]) },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformInvitationEmailBudgetService);
  });

  it('admits within budget and charges both counters in one script call', async () => {
    redis.eval.mockResolvedValue(0);

    const outcome = await service.claim('actor-1', 'rs-1', 5);

    expect(outcome).toBe('ok');
    expect(redis.eval).toHaveBeenCalledTimes(1);
    const [, numKeys, actorKey, roleSetKey, count, actorMax, roleSetMax, ttl] =
      redis.eval.mock.calls[0];
    expect(numKeys).toBe(2);
    expect(actorKey).toContain('actor-1');
    expect(roleSetKey).toContain('rs-1');
    expect([count, actorMax, roleSetMax, ttl]).toEqual([
      '5',
      '200',
      '300',
      '3600',
    ]);
  });

  it('reports which budget was exceeded', async () => {
    redis.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await service.claim('actor-1', 'rs-1', 5)).toBe('actor');
    expect(await service.claim('actor-1', 'rs-1', 5)).toBe('roleSet');
  });

  it('keys the window by epoch hour so a stranded counter cannot throttle forever', async () => {
    redis.eval.mockResolvedValue(0);
    const now = vi.spyOn(Date, 'now');

    now.mockReturnValue(0);
    await service.claim('actor-1', 'rs-1', 1);
    now.mockReturnValue(3600 * 1000);
    await service.claim('actor-1', 'rs-1', 1);

    expect(redis.eval.mock.calls[0][2]).not.toBe(redis.eval.mock.calls[1][2]);
  });

  it('does not touch the store for a zero count', async () => {
    expect(await service.claim('actor-1', 'rs-1', 0)).toBe('ok');
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('fails open on a Redis error and logs', async () => {
    redis.eval.mockRejectedValue(new Error('redis down'));

    expect(await service.claim('actor-1', 'rs-1', 3)).toBe('ok');
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [payload, , context] = logger.error.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({ actorID: 'actor-1', roleSetID: 'rs-1' })
    );
    expect(context).toBe(LogContext.ROLES);
  });
});
