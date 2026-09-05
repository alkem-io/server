import { ActorContext } from '@core/actor-context/actor.context';
import { MemoSigningResolverMutations } from './memo.signing.resolver.mutations';

describe('MemoSigningResolverMutations', () => {
  it('delegates a server-owned preparation without accepting PDF input', async () => {
    const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
    const result = {
      attemptId: 'attempt-1',
      previewUrl: '/api/private/rest/content-signing/attempt-1/snapshot',
    };
    const signingService = {
      prepareMemoSigning: vi.fn().mockResolvedValue(result),
    };
    const resolver = new MemoSigningResolverMutations(signingService as any);

    await expect(resolver.prepareMemoSigning(actor, 'memo-1')).resolves.toBe(
      result
    );
    expect(signingService.prepareMemoSigning).toHaveBeenCalledWith(
      'memo-1',
      actor
    );
    expect(resolver.prepareMemoSigning).toHaveLength(2);
  });
});
