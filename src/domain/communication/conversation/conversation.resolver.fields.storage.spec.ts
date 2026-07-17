import { LogContext } from '@common/enums';
import {
  EntityNotInitializedException,
  ForbiddenException,
} from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { ConversationResolverFields } from './conversation.resolver.fields';
import { ConversationService } from './conversation.service';

const bucket = { id: 'conv-bucket', authorization: { id: 'auth' } } as any;
const conversation = { id: 'conv-1' } as any;

describe('ConversationResolverFields.storageBucket (C1)', () => {
  let resolver: ConversationResolverFields;
  let conversationService: Mocked<ConversationService>;
  let authorizationService: Mocked<AuthorizationService>;

  const build = async (flagEnabled: boolean) => {
    const mockConfig = {
      get: vi.fn((key: string) =>
        key === 'communications.message_attachments.enabled'
          ? flagEnabled
          : undefined
      ),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationResolverFields,
        { provide: ConfigService, useValue: mockConfig },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ConversationResolverFields);
    conversationService = module.get(ConversationService);
    authorizationService = module.get(AuthorizationService);
    conversationService.getStorageBucket.mockResolvedValue(bucket);
  };

  it('returns null when message attachments are disabled', async () => {
    await build(false);
    const result = await resolver.storageBucket(conversation, {} as any);
    expect(result).toBeNull();
    expect(conversationService.getStorageBucket).not.toHaveBeenCalled();
  });

  it('returns the bucket for a member (READ granted)', async () => {
    await build(true);
    authorizationService.grantAccessOrFail.mockReturnValue(true as any);
    const result = await resolver.storageBucket(conversation, {} as any);
    expect(result).toBe(bucket);
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
  });

  it('returns null when the conversation has no bucket yet (FIX 4, backfillable state)', async () => {
    await build(true);
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

  it('denies a non-member (READ gate throws)', async () => {
    await build(true);
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new ForbiddenException('denied', LogContext.AUTH);
    });
    await expect(
      resolver.storageBucket(conversation, {} as any)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
