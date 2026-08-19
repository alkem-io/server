import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { SpaceCollectionService } from './space.collection.service';

// Covers the SPACES callout collection (workspace#013-spaces-collection-callout,
// US1/US2): host-space resolution, pinned-first ordering, and empty results.
describe('SpaceCollectionService', () => {
  let service: SpaceCollectionService;
  let communityResolver: CommunityResolverService;

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

    const result = await service.getSubspaces(callout);

    expect(result.map(s => s.id)).toEqual(['c', 'b', 'a']);
  });

  it('returns an empty list when the callout is not attached to a space', async () => {
    vi.mocked(
      communityResolver.getSpaceWithSubspacesFromCollaborationCallout
    ).mockResolvedValue(null);

    const result = await service.getSubspaces(callout);

    expect(result).toEqual([]);
  });

  it('returns an empty list when the host space has no subspaces', async () => {
    vi.mocked(
      communityResolver.getSpaceWithSubspacesFromCollaborationCallout
    ).mockResolvedValue({ id: 'host-space', subspaces: [] } as any);

    const result = await service.getSubspaces(callout);

    expect(result).toEqual([]);
  });

  // --- CUSTOM selection mode (workspace#025, T011) ---
  describe('CUSTOM selection mode intersection (T011 / FR-007)', () => {
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

      const result = await service.getSubspaces(callout); // no selection in callout
      expect(result).toHaveLength(3);
    });

    it('[S2] AUTO + non-empty selectedIds ⇒ selectedIds inert, full set returned', async () => {
      vi.mocked(
        communityResolver.getSpaceWithSubspacesFromCollaborationCallout
      ).mockResolvedValue(hostSpaceWithSubs() as any);

      const result = await service.getSubspaces(
        calloutWithSelection(CalloutSelectionMode.AUTO, ['a'])
      );
      expect(result).toHaveLength(3);
    });

    it('CUSTOM + selected subset ⇒ only selected subspaces returned (pinned-first order)', async () => {
      vi.mocked(
        communityResolver.getSpaceWithSubspacesFromCollaborationCallout
      ).mockResolvedValue(hostSpaceWithSubs() as any);

      const result = await service.getSubspaces(
        calloutWithSelection(CalloutSelectionMode.CUSTOM, ['c', 'a'])
      );
      expect(result.map(s => s.id)).toEqual(['c', 'a']); // c is pinned → first
    });

    it('[S4] CUSTOM + foreign persisted id ⇒ silently dropped (never in subspaces list)', async () => {
      vi.mocked(
        communityResolver.getSpaceWithSubspacesFromCollaborationCallout
      ).mockResolvedValue(hostSpaceWithSubs() as any);

      const result = await service.getSubspaces(
        calloutWithSelection(CalloutSelectionMode.CUSTOM, [
          'foreign-id-from-another-space',
        ])
      );
      expect(result).toEqual([]);
    });

    it('CUSTOM + all selected subspaces deleted ⇒ empty (existing empty state)', async () => {
      vi.mocked(
        communityResolver.getSpaceWithSubspacesFromCollaborationCallout
      ).mockResolvedValue({ id: 'host-space', subspaces: [] } as any);

      const result = await service.getSubspaces(
        calloutWithSelection(CalloutSelectionMode.CUSTOM, ['a', 'b'])
      );
      expect(result).toEqual([]);
    });

    it('[S7-read] selected subset returned in pinned-first then sortOrder', async () => {
      vi.mocked(
        communityResolver.getSpaceWithSubspacesFromCollaborationCallout
      ).mockResolvedValue({
        id: 'host-space',
        subspaces: [
          subspace('x', 5, 'X'),
          subspace('y', 1, 'Y'),
          subspace('z', 10, 'Z', true), // pinned
        ],
      } as any);

      const result = await service.getSubspaces(
        calloutWithSelection(CalloutSelectionMode.CUSTOM, ['x', 'y', 'z'])
      );
      expect(result.map(s => s.id)).toEqual(['z', 'y', 'x']);
    });
  });
});
