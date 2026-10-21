import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { EntityManager } from 'typeorm';
import { SpaceCollectionService } from './space.collection.service';

/**
 * Covers the SPACES callout collection's AUTO mode
 * (workspace#013-spaces-collection-callout, US1/US2): host-space resolution,
 * pinned-first ordering, and empty results.
 *
 * AUTO ONLY. The CUSTOM cases this suite used to carry were moved to
 * `space.collection.service.account-scope.spec.ts` by workspace#084, because
 * the CUSTOM branch no longer resolves its spaces through
 * `CommunityResolverService` at all — it goes through the shared account-scope
 * predicate and a per-viewer READ filter — so driving CUSTOM through the
 * resolver mock here would assert a path the service is forbidden to take.
 * See that file's header for the per-case disposition of the ones that moved,
 * were replaced, or were retired.
 */
describe('SpaceCollectionService (AUTO)', () => {
  let service: SpaceCollectionService;
  let communityResolver: CommunityResolverService;

  const actorContext = { credentials: [] } as unknown as ActorContext;
  const callout = { id: 'callout-1' } as ICallout;

  const calloutWithSelection = (
    mode: CalloutSelectionMode,
    selectedIds: string[]
  ): ICallout =>
    ({
      id: 'callout-1',
      settings: { framing: { selection: { mode, selectedIds } } },
    }) as unknown as ICallout;

  const subspace = (
    id: string,
    sortOrder: number,
    displayName: string,
    pinned = false
  ): any => ({
    id,
    sortOrder,
    pinned,
    about: { profile: { displayName } },
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceCollectionService,
        {
          provide: CommunityResolverService,
          useValue: {
            getSpaceWithSubspacesFromCollaborationCallout: vi.fn(),
          },
        },
        {
          provide: AuthorizationService,
          useValue: { isAccessGranted: vi.fn() },
        },
        {
          provide: getEntityManagerToken('default'),
          useValue: {
            findOne: vi.fn(),
            createQueryBuilder: vi.fn(),
          } as unknown as EntityManager,
        },
      ],
    }).compile();

    service = module.get(SpaceCollectionService);
    communityResolver = module.get(CommunityResolverService);
  });

  it('returns the host space subspaces pinned-first, then by sortOrder/displayName', async () => {
    vi.mocked(
      communityResolver.getSpaceWithSubspacesFromCollaborationCallout
    ).mockResolvedValue({
      id: 'host-space',
      subspaces: [
        subspace('a', 30, 'Alpha'),
        subspace('b', 10, 'Bravo'),
        subspace('c', 20, 'Charlie', true), // pinned
      ],
    } as any);

    const result = await service.getSubspaces(callout, actorContext);

    expect(result.map(s => s.id)).toEqual(['c', 'b', 'a']);
  });

  it('returns an empty list when the callout is not attached to a space', async () => {
    vi.mocked(
      communityResolver.getSpaceWithSubspacesFromCollaborationCallout
    ).mockResolvedValue(null);

    const result = await service.getSubspaces(callout, actorContext);

    expect(result).toEqual([]);
  });

  it('returns an empty list when the host space has no subspaces', async () => {
    vi.mocked(
      communityResolver.getSpaceWithSubspacesFromCollaborationCallout
    ).mockResolvedValue({ id: 'host-space', subspaces: [] } as any);

    const result = await service.getSubspaces(callout, actorContext);

    expect(result).toEqual([]);
  });

  // --- selection-mode defaulting (workspace#025, T011) ---
  describe('selection mode defaulting (T011 / FR-007)', () => {
    const hostSpaceWithSubs = () => ({
      id: 'host-space',
      subspaces: [
        subspace('a', 30, 'Alpha'),
        subspace('b', 10, 'Bravo'),
        subspace('c', 20, 'Charlie', true), // pinned
      ],
    });

    it('[S1] legacy callout without selection block ⇒ AUTO full set returned', async () => {
      vi.mocked(
        communityResolver.getSpaceWithSubspacesFromCollaborationCallout
      ).mockResolvedValue(hostSpaceWithSubs() as any);

      const result = await service.getSubspaces(callout, actorContext); // no selection in callout
      expect(result).toHaveLength(3);
    });

    it('[S2] AUTO + non-empty selectedIds ⇒ selectedIds inert, full set returned', async () => {
      vi.mocked(
        communityResolver.getSpaceWithSubspacesFromCollaborationCallout
      ).mockResolvedValue(hostSpaceWithSubs() as any);

      const result = await service.getSubspaces(
        calloutWithSelection(CalloutSelectionMode.AUTO, ['a']),
        actorContext
      );
      expect(result).toHaveLength(3);
    });

    // MOVED to space.collection.service.account-scope.spec.ts (workspace#084):
    //  - 'CUSTOM + selected subset'            → moved, MINUS its pinned-first
    //    order assertion, which FR-019 retires: pinned/sortOrder are
    //    parent-relative and a CUSTOM selection spans parents, so the server
    //    no longer orders that list at all.
    //  - '[S4] CUSTOM + foreign persisted id'  → REPLACED, because its
    //    semantics genuinely invert. A same-account NON-SUBSPACE is now
    //    RETURNED; what gets dropped is a space that has LEFT the account.
    //  - 'CUSTOM + all selected deleted'       → moved, now paired with
    //    hasHiddenSpaces === false (a deleted/departed entry is stale, not
    //    hidden).
    //  - '[S7-read] CUSTOM ordering'           → RETIRED by FR-019, not
    //    silently dropped: server-side ordering of a CUSTOM result is now
    //    forbidden, and the new spec asserts no ordering helper is called.
  });
});
