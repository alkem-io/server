import { CalloutMyReactionLoaderCreator } from '@core/dataloader/creators/loader.creators/callout/callout.my.reaction.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CALLOUT_REACTION_ALLOWED_EMOJIS } from '@domain/collaboration/reaction/reaction.constants';
import { ReactionService } from '@domain/collaboration/reaction/reaction.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { CalloutResolverFields } from './callout.resolver.fields';

function makeCallout(
  id: string,
  allowedTypes: string[],
  activity?: number
): ICallout {
  return {
    id,
    activity,
    settings: { contribution: { allowedTypes } },
  } as unknown as ICallout;
}

describe('CalloutResolverFields', () => {
  let resolver: CalloutResolverFields;
  let calloutService: Mocked<CalloutService>;
  let reactionService: Mocked<ReactionService>;
  let myReactionHelper: Mocked<CalloutMyReactionLoaderCreator>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CalloutResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<CalloutResolverFields>(CalloutResolverFields);
    calloutService = module.get<CalloutService>(
      CalloutService
    ) as Mocked<CalloutService>;
    reactionService = module.get<ReactionService>(
      ReactionService
    ) as Mocked<ReactionService>;
    myReactionHelper = module.get<CalloutMyReactionLoaderCreator>(
      CalloutMyReactionLoaderCreator
    ) as Mocked<CalloutMyReactionLoaderCreator>;
  });

  describe('activity', () => {
    it('should return pre-computed activity without calling loader', async () => {
      const callout = makeCallout('c-1', ['POST'], 42);
      const loader = {
        load: vi.fn().mockResolvedValue(10),
      } as unknown as ILoader<number>;

      const result = await resolver.activity(callout, loader);

      expect(result).toBe(42);
      expect(loader.load).not.toHaveBeenCalled();
      expect(calloutService.getActivityCount).not.toHaveBeenCalled();
    });

    it('should use DataLoader for contribution-type callouts', async () => {
      const callout = makeCallout('c-2', ['POST']);
      const loader = {
        load: vi.fn().mockResolvedValue(7),
      } as unknown as ILoader<number>;

      const result = await resolver.activity(callout, loader);

      expect(result).toBe(7);
      expect(loader.load).toHaveBeenCalledWith('c-2');
    });

    it('should fall back to service for comment-type callouts', async () => {
      const callout = makeCallout('c-3', []);
      const loader = {
        load: vi.fn(),
      } as unknown as ILoader<number>;
      calloutService.getActivityCount.mockResolvedValue(3);

      const result = await resolver.activity(callout, loader);

      expect(result).toBe(3);
      expect(loader.load).not.toHaveBeenCalled();
      expect(calloutService.getActivityCount).toHaveBeenCalledWith(callout);
    });

    it('should prioritize pre-computed activity even for contribution-type callouts', async () => {
      const callout = makeCallout('c-4', ['WHITEBOARD'], 99);
      const loader = {
        load: vi.fn().mockResolvedValue(1),
      } as unknown as ILoader<number>;

      const result = await resolver.activity(callout, loader);

      expect(result).toBe(99);
      expect(loader.load).not.toHaveBeenCalled();
    });
  });

  describe('reactionsSummary', () => {
    function makeSummaryLoader(result: unknown) {
      return {
        load: vi.fn().mockResolvedValue(result),
      } as unknown as ILoader<unknown>;
    }

    it('returns zero total and empty emojis when there are no reactions', async () => {
      const callout = makeCallout('c-1', []);
      vi.mocked(myReactionHelper.getMyReactionEmoji).mockResolvedValue(null);
      const loader = makeSummaryLoader(null);

      const result = await resolver.reactionsSummary(
        callout as any,
        { actorID: undefined } as any,
        loader as any
      );

      expect(result.total).toBe(0);
      expect(result.emojis).toEqual([]);
      expect(result.myReactionEmoji).toBeNull();
    });

    it('propagates total and emojis from the DataLoader summary', async () => {
      const callout = makeCallout('c-2', []);
      vi.mocked(myReactionHelper.getMyReactionEmoji).mockResolvedValue('heart');
      const loader = makeSummaryLoader({
        total: 5,
        emojis: ['heart', 'rocket'],
      });

      const result = await resolver.reactionsSummary(
        callout as any,
        { actorID: 'user-1' } as any,
        loader as any
      );

      expect(result.total).toBe(5);
      expect(result.emojis).toEqual(['heart', 'rocket']);
      expect(result.myReactionEmoji).toBe('heart');
    });

    it('always includes the full allow-list in allowedEmojis regardless of current reactions', async () => {
      const callout = makeCallout('c-3', []);
      vi.mocked(myReactionHelper.getMyReactionEmoji).mockResolvedValue(null);
      const loader = makeSummaryLoader(null);

      const result = await resolver.reactionsSummary(
        callout as any,
        { actorID: 'user-1' } as any,
        loader as any
      );

      expect(result.allowedEmojis).toEqual([
        ...CALLOUT_REACTION_ALLOWED_EMOJIS,
      ]);
    });

    it('summary shape has NO per-emoji count field — only bare slug list and total', async () => {
      const callout = makeCallout('c-4', []);
      vi.mocked(myReactionHelper.getMyReactionEmoji).mockResolvedValue(null);
      const loader = makeSummaryLoader({ total: 2, emojis: ['heart'] });

      const result = await resolver.reactionsSummary(
        callout as any,
        { actorID: 'user-1' } as any,
        loader as any
      );

      // The result type must not carry any per-emoji count — only the slug array.
      expect(Object.keys(result)).not.toContain('emojiCounts');
      expect(Object.keys(result)).not.toContain('counts');
      // emojis is a plain string array, not an array of objects
      for (const e of result.emojis) {
        expect(typeof e).toBe('string');
      }
    });
  });

  describe('reactions (tier-2)', () => {
    it('honours the 100-entry cap by delegating cap=100 to reactionService', async () => {
      const callout = makeCallout('c-1', []);
      vi.mocked(reactionService.getReactionsForEntity).mockResolvedValue([]);
      const userLoader = {
        load: vi.fn().mockResolvedValue(null),
      } as unknown as ILoader<unknown>;

      await resolver.reactions(callout as any, userLoader as any);

      expect(reactionService.getReactionsForEntity).toHaveBeenCalledWith(
        expect.anything(),
        'c-1',
        100
      );
    });

    it('drops entries whose user cannot be resolved (deletion race window)', async () => {
      const callout = makeCallout('c-2', []);
      const now = new Date();
      vi.mocked(reactionService.getReactionsForEntity).mockResolvedValue([
        {
          id: 'r1',
          emoji: 'heart',
          createdBy: 'u-gone',
          updatedDate: now,
        } as any,
        {
          id: 'r2',
          emoji: 'rocket',
          createdBy: 'u-ok',
          updatedDate: now,
        } as any,
      ]);
      const userLoader = {
        load: vi.fn().mockImplementation((uid: string) => {
          if (uid === 'u-gone') return Promise.resolve(null);
          return Promise.resolve({ id: uid });
        }),
      } as unknown as ILoader<unknown>;

      const results = await resolver.reactions(
        callout as any,
        userLoader as any
      );

      // The entry with a null user must be silently dropped, not nulled.
      expect(results).toHaveLength(1);
      expect(results[0].emoji).toBe('rocket');
    });

    it('returns entries in the order returned by the service (descending updatedDate)', async () => {
      const callout = makeCallout('c-3', []);
      const t1 = new Date('2026-08-10T10:00:00Z');
      const t2 = new Date('2026-08-09T10:00:00Z');
      vi.mocked(reactionService.getReactionsForEntity).mockResolvedValue([
        {
          id: 'r-newer',
          emoji: 'heart',
          createdBy: 'u1',
          updatedDate: t1,
        } as any,
        {
          id: 'r-older',
          emoji: 'rocket',
          createdBy: 'u2',
          updatedDate: t2,
        } as any,
      ]);
      const userLoader = {
        load: vi
          .fn()
          .mockImplementation((uid: string) => Promise.resolve({ id: uid })),
      } as unknown as ILoader<unknown>;

      const results = await resolver.reactions(
        callout as any,
        userLoader as any
      );

      // Newer reaction is first (the service returns DESC by updatedDate).
      expect(results[0].id).toBe('r-newer');
      expect(results[1].id).toBe('r-older');
    });
  });
});
