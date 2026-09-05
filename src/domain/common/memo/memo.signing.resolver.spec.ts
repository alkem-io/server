import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { UserLoaderCreator } from '@core/dataloader/creators';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '@core/dataloader/data.loader.inject.token';
import { SigningAttemptStatus } from '@domain/common/content-signing/signing.attempt.status';
import { DELETED_USER_SENTINEL } from '@domain/community/user/account-deletion/deleted.user.sentinel';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
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
    expect(memoService.isMultiUser).not.toHaveBeenCalled();
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actor,
      { id: 'memo-auth' },
      AuthorizationPrivilege.READ,
      'read memo signatures'
    );
    expect(attemptService.findSignedForMemo).toHaveBeenCalledWith('memo-1');
  });

  it('resolves the stored signed document and attributes a missing actor to the deleted-user sentinel', async () => {
    const document = { id: 'document-1' };
    const documentService = {
      getDocumentOrFail: vi.fn().mockResolvedValue(document),
    };
    const resolver = new MemoSignatureResolverFields(documentService as any);
    const userLoader = { load: vi.fn().mockResolvedValue(null) };

    await expect(resolver.document(attempt as any)).resolves.toBe(document);
    await expect(
      resolver.actor(attempt as any, userLoader as any)
    ).resolves.toBe(DELETED_USER_SENTINEL);
    expect(documentService.getDocumentOrFail).toHaveBeenCalledWith(
      'document-1'
    );
    expect(userLoader.load).toHaveBeenCalledWith('deleted-user');

    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      MemoSignatureResolverFields,
      'actor'
    ) as Record<
      string,
      {
        index: number;
        factory: (data: unknown, context: unknown) => unknown;
        data: unknown;
      }
    >;
    const loaderParameter = Object.values(metadata).find(
      parameter => parameter.index === 1
    );
    const get = vi.fn().mockReturnValue(userLoader);
    loaderParameter?.factory(loaderParameter.data, {
      getType: () => 'graphql',
      getArgs: () => [
        attempt,
        {},
        { [DATA_LOADER_CTX_INJECT_TOKEN]: { get } },
        undefined,
      ],
      getClass: () => MemoSignatureResolverFields,
      getHandler: () => MemoSignatureResolverFields.prototype.actor,
    });
    expect(get).toHaveBeenCalledWith(UserLoaderCreator, {
      resolveToNull: true,
    });

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
