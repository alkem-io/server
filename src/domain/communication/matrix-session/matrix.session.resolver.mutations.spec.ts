import { ActorContext } from '@core/actor-context/actor.context';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatrixSessionResolverMutations } from './matrix.session.resolver.mutations';

/**
 * workspace#091, FR-007/D4. `mintMatrixSession` is caller-scoped by
 * STRUCTURE, not by a check: it takes no subject argument, so the arity case
 * below is the executable form of "there is no subject parameter" — a
 * re-added subject argument reds there, which is the one thing a reviewer
 * cannot reliably be.
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

  it('refuses a bearer-authenticated caller and never calls the service (SEC-091-SRV-10)', async () => {
    // The mint is confined to the first-party session cookie. A Hydra API
    // bearer resolves to a real, non-anonymous actor, so the authentication
    // guard would pass it — only the transport check stops it.
    await expect(
      resolver.mintMatrixSession(actor('actor-uuid-123', false), 'Bearer rs256')
    ).rejects.toThrow(/first-party/i);
    expect(matrixSessionService.mintForActor).not.toHaveBeenCalled();
  });

  it('takes the actor and the Authorization header — there is no subject argument (FR-007/D4)', () => {
    expect(
      MatrixSessionResolverMutations.prototype.mintMatrixSession
    ).toHaveLength(2);
  });
});
