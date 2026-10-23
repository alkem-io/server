import { ActorContext } from '@core/actor-context/actor.context';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatrixSessionResolverMutations } from './matrix.session.resolver.mutations';

/**
 * workspace#091, FR-007/D4. `mintMatrixSession` is caller-scoped by
 * STRUCTURE, not by a check: it takes no arguments, so case 3 below is the
 * executable form of "there is no subject parameter" — a re-added subject
 * argument reds here, which is the one thing a reviewer cannot reliably be.
 */
describe('MatrixSessionResolverMutations', () => {
  let resolver: MatrixSessionResolverMutations;
  let matrixSessionService: { mintForActor: ReturnType<typeof vi.fn> };

  const actor = (actorID: string, isAnonymous: boolean) => {
    const ctx = new ActorContext();
    ctx.actorID = actorID;
    ctx.isAnonymous = isAnonymous;
    return ctx;
  };

  beforeEach(() => {
    matrixSessionService = {
      mintForActor: vi.fn().mockResolvedValue({
        userId: '@u:hs',
        deviceId: 'DEV1',
        accessToken: 'tok',
      }),
    };
    resolver = new MatrixSessionResolverMutations(matrixSessionService as any);
  });

  it('refuses an anonymous actor and never calls the service', async () => {
    await expect(resolver.mintMatrixSession(actor('', true))).rejects.toThrow(
      /authenticated user/i
    );
    expect(matrixSessionService.mintForActor).not.toHaveBeenCalled();
  });

  it("passes the caller's own actorID to the service and nothing else", async () => {
    const credentials = await resolver.mintMatrixSession(
      actor('actor-uuid-123', false)
    );

    expect(matrixSessionService.mintForActor).toHaveBeenCalledWith(
      'actor-uuid-123'
    );
    expect(credentials).toEqual({
      userId: '@u:hs',
      deviceId: 'DEV1',
      accessToken: 'tok',
    });
  });

  it('takes exactly one parameter — there is no subject argument (FR-007/D4)', () => {
    expect(
      MatrixSessionResolverMutations.prototype.mintMatrixSession
    ).toHaveLength(1);
  });
});
