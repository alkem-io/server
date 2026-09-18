import { ReactionType } from '@common/enums/reaction.type';
import { ReactionService } from '@domain/collaboration/reaction/reaction.service';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { CalloutMyReactionLoaderCreator } from './callout.my.reaction.loader.creator';

describe('CalloutMyReactionLoaderCreator', () => {
  let loader: CalloutMyReactionLoaderCreator;
  let reactionService: Mocked<ReactionService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CalloutMyReactionLoaderCreator],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    // Request-scoped providers must be resolved, not fetched with get().
    loader = await module.resolve(CalloutMyReactionLoaderCreator);
    reactionService = module.get(ReactionService) as Mocked<ReactionService>;
  });

  it('should be defined', () => {
    expect(loader).toBeDefined();
  });

  describe('loadMyReaction', () => {
    it('returns null immediately without querying when the user is unauthenticated', async () => {
      const result = await loader.loadMyReaction('callout-1', null);

      expect(result).toBeNull();
      expect(reactionService.getMyReactionsForEntities).not.toHaveBeenCalled();
    });

    it('returns the emoji slug when the user has reacted', async () => {
      reactionService.getMyReactionsForEntities.mockResolvedValue(
        new Map([['callout-1', 'heart']])
      );

      const result = await loader.loadMyReaction('callout-1', 'user-1');

      expect(result).toBe('heart');
    });

    it('returns null when the user has not reacted on a callout', async () => {
      reactionService.getMyReactionsForEntities.mockResolvedValue(new Map());

      const result = await loader.loadMyReaction('callout-1', 'user-1');

      expect(result).toBeNull();
    });

    it('issues a single batched query for N callouts in the same tick — not one query per callout', async () => {
      reactionService.getMyReactionsForEntities.mockResolvedValue(
        new Map([
          ['callout-1', 'heart'],
          ['callout-3', 'rocket'],
        ])
      );

      const [r1, r2, r3] = await Promise.all([
        loader.loadMyReaction('callout-1', 'user-1'),
        loader.loadMyReaction('callout-2', 'user-1'),
        loader.loadMyReaction('callout-3', 'user-1'),
      ]);

      // All three callouts resolved with a single service call.
      expect(reactionService.getMyReactionsForEntities).toHaveBeenCalledTimes(
        1
      );
      expect(reactionService.getMyReactionsForEntities).toHaveBeenCalledWith(
        ReactionType.POST,
        expect.arrayContaining(['callout-1', 'callout-2', 'callout-3']),
        'user-1'
      );

      expect(r1).toBe('heart');
      expect(r2).toBeNull();
      expect(r3).toBe('rocket');
    });

    it('uses separate loaders per user so user reactions do not bleed across users', async () => {
      reactionService.getMyReactionsForEntities
        .mockResolvedValueOnce(new Map([['callout-1', 'heart']]))
        .mockResolvedValueOnce(new Map([['callout-1', 'rocket']]));

      const [r1, r2] = await Promise.all([
        loader.loadMyReaction('callout-1', 'user-1'),
        loader.loadMyReaction('callout-1', 'user-2'),
      ]);

      expect(reactionService.getMyReactionsForEntities).toHaveBeenCalledTimes(
        2
      );
      expect(r1).toBe('heart');
      expect(r2).toBe('rocket');
    });

    it('caches results within the same user so repeated loads do not re-query', async () => {
      reactionService.getMyReactionsForEntities.mockResolvedValue(
        new Map([['callout-1', 'thumbsup']])
      );

      const r1 = await loader.loadMyReaction('callout-1', 'user-1');
      const r2 = await loader.loadMyReaction('callout-1', 'user-1');

      expect(reactionService.getMyReactionsForEntities).toHaveBeenCalledTimes(
        1
      );
      expect(r1).toBe('thumbsup');
      expect(r2).toBe('thumbsup');
    });
  });
});
