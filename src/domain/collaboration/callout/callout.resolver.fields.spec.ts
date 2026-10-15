import { AuthorizationPrivilege } from '@common/enums';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { ReactionType } from '@common/enums/reaction.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutMyReactionLoaderCreator } from '@core/dataloader/creators/loader.creators/callout/callout.my.reaction.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CALLOUT_REACTION_ALLOWED_EMOJIS } from '@domain/collaboration/reaction/reaction.constants';
import { ReactionService } from '@domain/collaboration/reaction/reaction.service';
import { SpaceCollectionService } from '@domain/collaboration/space-collection/space.collection.service';
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
  let spaceCollectionService: Mocked<SpaceCollectionService>;
  let authorizationService: Mocked<AuthorizationService>;

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
    spaceCollectionService = module.get<SpaceCollectionService>(
      SpaceCollectionService
    ) as Mocked<SpaceCollectionService>;
    authorizationService = module.get<AuthorizationService>(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
  });

  // workspace#084 SEC-084-CW-01. The curated list is readable only by actors who
  // may EDIT the callout. Handing it to a viewer defeats AC6: the notice reports
  // only THAT spaces are hidden, but a viewer holding the stored list can diff it
  // against the rendered `framing.subspaces` and recover the exact count and the
  // UUIDs withheld from them.
  describe('settings — selectedIds redaction', () => {
    const actorContext = { actorID: 'actor-1' } as any;

    const makeSelectionCallout = (): ICallout =>
      ({
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        settings: {
          visibility: 'published',
          contribution: { allowedTypes: [] },
          framing: {
            // Siblings of `selection` are deliberately populated: with a
            // framing that held nothing else, dropping the `...settings.framing`
            // spread from the redaction kept every case green while nullifying
            // the non-null CalloutSettingsFraming.commentsEnabled in production
            // (review ENG-084-R-03).
            commentsEnabled: true,
            spaces: { cardVariant: 'COMPACT' },
            contributors: { defaultView: 'LIST' },
            selection: {
              mode: CalloutSelectionMode.CUSTOM,
              selectedIds: ['space-a', 'space-b'],
            },
          },
        },
      }) as unknown as ICallout;

    it('hands the real list to an actor holding UPDATE', () => {
      authorizationService.isAccessGranted.mockReturnValue(true);
      const callout = makeSelectionCallout();

      const result = resolver.settings(callout, actorContext);

      expect(result.framing.selection?.selectedIds).toEqual([
        'space-a',
        'space-b',
      ]);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.UPDATE
      );
    });

    // RED without the redaction: the viewer receives ['space-a','space-b'].
    it('redacts the list to EMPTY for an actor without UPDATE', () => {
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = resolver.settings(makeSelectionCallout(), actorContext);

      expect(result.framing.selection?.selectedIds).toEqual([]);
    });

    // An empty array, never a throw and never null: selectedIds is `[ID!]!`, so
    // a throwing guard would nullify CalloutSelectionSettings and cascade up the
    // non-null chain. `mode` says how the collection is computed, not what is in
    // it, so it survives redaction — the client reads it at two mount sites.
    it('keeps the non-null contract and preserves mode while redacting', () => {
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = resolver.settings(makeSelectionCallout(), actorContext);

      expect(Array.isArray(result.framing.selection?.selectedIds)).toBe(true);
      expect(result.framing.selection?.mode).toBe(CalloutSelectionMode.CUSTOM);
      expect(result.visibility).toBe('published');
      expect(result.contribution).toEqual({ allowedTypes: [] });
      // RED if the `...settings.framing` spread is dropped.
      expect(result.framing.commentsEnabled).toBe(true);
      expect(result.framing.spaces).toEqual({ cardVariant: 'COMPACT' });
      expect(result.framing.contributors).toEqual({ defaultView: 'LIST' });
    });

    // RED against an in-place redaction: mutating callout.settings would strip
    // the list for every later consumer of the same loaded entity in the same
    // request, including the authorization layer and any save path.
    it('does NOT mutate the loaded callout', () => {
      authorizationService.isAccessGranted.mockReturnValue(false);
      const callout = makeSelectionCallout();

      resolver.settings(callout, actorContext);

      expect(callout.settings.framing.selection?.selectedIds).toEqual([
        'space-a',
        'space-b',
      ]);
    });

    // No selection, or an already-empty one, needs no privilege check at all —
    // AUTO collections and every non-collection callout kind pay nothing.
    it('short-circuits with no privilege check when there is nothing to redact', () => {
      const callout = {
        id: 'callout-2',
        authorization: { id: 'auth-2' },
        settings: { contribution: { allowedTypes: [] }, framing: {} },
      } as unknown as ICallout;

      const result = resolver.settings(callout, actorContext);

      expect(result).toBe(callout.settings);
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });

    // Fail closed, and now REACHABLE through GraphQL: the field guard that used
    // to throw first was deleted (review ENG-084-R-01/SEC-R3/SEC-R4), so an
    // authorization-less callout — authorizationId is ON DELETE SET NULL —
    // does reach this branch.
    it('redacts when the callout carries no authorization policy', () => {
      const callout = makeSelectionCallout();
      (callout as any).authorization = undefined;

      const result = resolver.settings(callout, actorContext);

      expect(result.framing.selection?.selectedIds).toEqual([]);
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });
  });

  // workspace#084 FR-018 / AC6. The field lives HERE, on the Callout, and not
  // on CalloutFraming, because the selection mode is a jsonb column on this
  // parent object — a framing-level field would have to load the parent
  // callout before it could answer `false` for AUTO (carried finding
  // COMP-084-R5-07: the sibling resolve fields all carry cases here).
  describe('hasHiddenSpaces', () => {
    const actorContext = { credentials: [] } as any;

    it('delegates to the collection service with the requesting actor', async () => {
      const callout = makeCallout('c-1', []);
      spaceCollectionService.hasHiddenSpaces.mockResolvedValue(true);

      const result = await resolver.hasHiddenSpaces(callout, actorContext);

      expect(result).toBe(true);
      expect(spaceCollectionService.hasHiddenSpaces).toHaveBeenCalledWith(
        callout,
        actorContext
      );
    });
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
      vi.mocked(myReactionHelper.loadMyReaction).mockResolvedValue(null);
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
      vi.mocked(myReactionHelper.loadMyReaction).mockResolvedValue('heart');
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
      vi.mocked(myReactionHelper.loadMyReaction).mockResolvedValue(null);
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
      vi.mocked(myReactionHelper.loadMyReaction).mockResolvedValue(null);
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
        ReactionType.POST,
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
