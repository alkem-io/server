import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { SigningAttemptStatus } from '@domain/common/content-signing/signing.attempt.status';
import { MemoResolverFields } from './memo.resolver.fields';
import { MemoSignatureResolverFields } from './memo.signature.resolver.fields';

describe('memo signing GraphQL reads', () => {
  const actor = Object.assign(new ActorContext(), { actorID: 'actor-1' });
  const attempt = {
    id: 'attempt-1',
    actorId: 'deleted-user',
    memoId: 'memo-1',
    signedDocumentId: 'document-1',
    status: SigningAttemptStatus.SIGNED,
  };

  it('returns an attempt only through its initiating actor binding', async () => {
    const attemptService = {
      getForActorOrFail: vi.fn().mockResolvedValue(attempt),
    };
    const resolver = new MemoResolverFields(
      {} as any,
      attemptService as any,
      {} as any,
      {} as any
    );

    await expect(resolver.signingAttempt(actor, 'attempt-1')).resolves.toBe(
      attempt
    );
    expect(attemptService.getForActorOrFail).toHaveBeenCalledWith(
      'attempt-1',
      'actor-1'
    );
  });

  it('READ-gates a memo signed-copy list and returns only service-filtered rows', async () => {
    const memoService = { isMultiUser: vi.fn() };
    const authorizationService = { grantAccessOrFail: vi.fn() };
    const attemptService = {
      findSignedForMemo: vi.fn().mockResolvedValue([attempt]),
    };
    const resolver = new MemoResolverFields(
      memoService as any,
      attemptService as any,
      authorizationService as any,
      {} as any
    );

    await expect(
      resolver.signatures(
        { id: 'memo-1', authorization: { id: 'memo-auth' } } as any,
        actor
      )
    ).resolves.toEqual([attempt]);
    expect(memoService).not.toHaveProperty('getMemoOrFail');
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actor,
      { id: 'memo-auth' },
      AuthorizationPrivilege.READ,
      'read memo signatures: memo-1'
    );
    expect(attemptService.findSignedForMemo).toHaveBeenCalledWith('memo-1');
  });

  it('resolves the stored signed document and preserves deleted-user null handling', async () => {
    const document = { id: 'document-1' };
    const documentService = {
      getDocumentOrFail: vi.fn().mockResolvedValue(document),
    };
    const resolver = new MemoSignatureResolverFields(documentService as any);
    const userLoader = { load: vi.fn().mockResolvedValue(null) };

    await expect(resolver.document(attempt as any)).resolves.toBe(document);
    await expect(
      resolver.actor(attempt as any, userLoader as any)
    ).resolves.toBeNull();
    expect(documentService.getDocumentOrFail).toHaveBeenCalledWith(
      'document-1'
    );
    expect(userLoader.load).toHaveBeenCalledWith('deleted-user');

    expect(
      resolver.document({
        ...attempt,
        status: SigningAttemptStatus.CANCELLED,
        signedDocumentId: undefined,
      } as any)
    ).toBeNull();
    expect(documentService.getDocumentOrFail).toHaveBeenCalledTimes(1);
  });
});
