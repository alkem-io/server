import { LogContext } from '@common/enums';
import {
  EntityNotInitializedException,
  ForbiddenException,
} from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { ConversationResolverFields } from './conversation.resolver.fields';
import { ConversationService } from './conversation.service';

const bucket = {
  id: 'conv-bucket',
  // A real, membership-mirrored bucket policy: non-empty credentialRules is what
  // distinguishes an AUTHORIZED bucket from a backfilled-but-not-yet-reset one.
  authorization: {
    id: 'auth',
    credentialRules: [{ grantedPrivileges: ['read'], criterias: [] }],
  },
} as any;
const conversation = { id: 'conv-1' } as any;

describe('ConversationResolverFields.storageBucket (C1)', () => {
  let resolver: ConversationResolverFields;
  let conversationService: Mocked<ConversationService>;
  let authorizationService: Mocked<AuthorizationService>;

  const build = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationResolverFields],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ConversationResolverFields);
    conversationService = module.get(ConversationService);
    authorizationService = module.get(AuthorizationService);
    conversationService.getStorageBucket.mockResolvedValue(bucket);
  };

  it('returns the bucket for a member (READ granted)', async () => {
    await build();
    authorizationService.grantAccessOrFail.mockReturnValue(true as any);
    const result = await resolver.storageBucket(conversation, {} as any);
    expect(result).toBe(bucket);
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
  });

  it('returns null when the conversation has no bucket yet (FIX 4, backfillable state)', async () => {
    await build();
    // getStorageBucket throws EntityNotInitializedException for a bucket-less
    // conversation; the nullable field must resolve to null, not fail the query.
    conversationService.getStorageBucket.mockRejectedValue(
      new EntityNotInitializedException(
        'no bucket',
        LogContext.COMMUNICATION_CONVERSATION
      )
    );
    const result = await resolver.storageBucket(conversation, {} as any);
    expect(result).toBeNull();
    expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
  });

  it('A4: returns null when the bucket was backfilled with an EMPTY authorization policy', async () => {
    // The 013 backfill migration creates the bucket for every pre-existing
    // conversation with `credentialRules: '[]'`; the membership rules only land
    // on the next ConversationAuthorizationService reset. Until then the READ
    // gate would throw ForbiddenException AT A MEMBER and fail the whole
    // conversation query — degrade to null, exactly like "no bucket yet".
    await build();
    conversationService.getStorageBucket.mockResolvedValue({
      id: 'conv-bucket',
      authorization: { id: 'auth', credentialRules: [] },
    } as any);

    const result = await resolver.storageBucket(conversation, {} as any);

    expect(result).toBeNull();
    expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
  });

  it('denies a non-member (READ gate throws)', async () => {
    await build();
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new ForbiddenException('denied', LogContext.AUTH);
    });
    await expect(
      resolver.storageBucket(conversation, {} as any)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
