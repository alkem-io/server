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
});
