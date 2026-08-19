import { AuthorizationCredential } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';

/**
 * T010 (Foundational checkpoint): `ActorContextService.buildForActor(actorID)`
 * resolves the SEEDED `virtual-assistant` actor's credentials. We deliberately
 * do NOT add a new context builder — `buildForActor` already handles any actor
 * type (research D10). This pins that the singleton actor's GLOBAL_REGISTERED
 * credential (as seeded by the VirtualAssistant migration) is mapped into the
 * delegated/actor ActorContext correctly, which underpins attribution (FR-016)
 * and the system-invoked (Flow B) read path.
 */
describe('VirtualAssistant actor — buildForActor', () => {
  // Mirrors the fixed seed UUID + credential in
  // migrations/1780483789228-VirtualAssistant.ts.
  const SEEDED_ASSISTANT_ACTOR_ID = '068b7478-0abd-4f19-906b-e1534f3b71b7';

  let service: ActorContextService;
  let mockEntityManager: { findOne: ReturnType<typeof vi.fn> };
  let module: TestingModule;

  beforeEach(async () => {
    vi.restoreAllMocks();
    mockEntityManager = { findOne: vi.fn() };

    module = await Test.createTestingModule({
      providers: [
        ActorContextService,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ActorContextService);
  });

  it('resolves the seeded virtual-assistant actor with its GLOBAL_REGISTERED credential', async () => {
    const seededActor = {
      id: SEEDED_ASSISTANT_ACTOR_ID,
      credentials: [
        {
          type: AuthorizationCredential.GLOBAL_REGISTERED,
          resourceID: '',
        },
      ],
    } as unknown as Actor;

    mockEntityManager.findOne.mockResolvedValue(seededActor);

    const ctx = await service.buildForActor(SEEDED_ASSISTANT_ACTOR_ID);

    expect(ctx).toBeInstanceOf(ActorContext);
    expect(ctx.actorID).toBe(SEEDED_ASSISTANT_ACTOR_ID);
    expect(ctx.isAnonymous).toBe(false);
    expect(ctx.credentials).toHaveLength(1);
    expect(ctx.credentials[0].type).toBe(
      AuthorizationCredential.GLOBAL_REGISTERED
    );
    expect(ctx.credentials[0].resourceID).toBe('');
  });

  it('falls back to anonymous if the seeded actor is missing', async () => {
    mockEntityManager.findOne.mockResolvedValue(null);

    const ctx = await service.buildForActor(SEEDED_ASSISTANT_ACTOR_ID);

    expect(ctx.isAnonymous).toBe(true);
  });
});
