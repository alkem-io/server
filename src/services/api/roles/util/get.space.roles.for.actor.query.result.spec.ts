import { AuthorizationPrivilege } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Space } from '@domain/space/space/space.entity';
import { getSpaceRolesForActorQueryResult } from './get.space.roles.for.actor.query.result';
import { CredentialMap } from './group.credentials.by.entity';

const makeSpace = (
  id: string,
  opts: {
    hasAuth?: boolean;
    levelZeroSpaceID?: string;
    level?: SpaceLevel;
  } = {}
): Space => {
  const space = {
    id,
    nameID: `name-${id}`,
    level: opts.level ?? SpaceLevel.L0,
    levelZeroSpaceID: opts.levelZeroSpaceID ?? id,
    visibility: SpaceVisibility.ACTIVE,
    about: {
      profile: { displayName: `Space ${id}` },
    },
    authorization: opts.hasAuth !== false ? { id: `auth-${id}` } : undefined,
  } as unknown as Space;
  return space;
};

const makeCredentialMap = (entries?: [string, string[]][]): CredentialMap => {
  const spacesMap = new Map<string, string[]>(entries ?? []) as any;
  const map: CredentialMap = new Map();
  map.set('spaces' as any, spacesMap);
  return map;
};

describe('getSpaceRolesForActorQueryResult', () => {
  const actorContext = new ActorContext();
  const mockAuthService = {
    isAccessGranted: vi.fn(),
  } as unknown as AuthorizationService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an empty array when no spaces are provided', () => {
    const result = getSpaceRolesForActorQueryResult(
      makeCredentialMap(),
      [],
      [],
      actorContext,
      mockAuthService
    );
    expect(result).toEqual([]);
  });

  it('should skip spaces without authorization', () => {
    const space = makeSpace('s1', { hasAuth: false });
    const result = getSpaceRolesForActorQueryResult(
      makeCredentialMap(),
      [space],
      [],
      actorContext,
      mockAuthService
    );
    expect(result).toEqual([]);
  });

  it('should skip spaces where read access is not granted', () => {
    const space = makeSpace('s1');
    vi.mocked(mockAuthService.isAccessGranted).mockReturnValue(false);

    const result = getSpaceRolesForActorQueryResult(
      makeCredentialMap(),
      [space],
      [],
      actorContext,
      mockAuthService
    );
    expect(result).toEqual([]);
    expect(mockAuthService.isAccessGranted).toHaveBeenCalledWith(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.READ_ABOUT
    );
  });

  it('should return space result with roles when access is granted and no subspaces', () => {
    const space = makeSpace('s1');
    vi.mocked(mockAuthService.isAccessGranted).mockReturnValue(true);

    const result = getSpaceRolesForActorQueryResult(
      makeCredentialMap([['s1', ['admin', 'member']]]),
      [space],
      [],
      actorContext,
      mockAuthService
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
    expect(result[0].roles).toEqual(['admin', 'member']);
    expect(result[0].subspaces).toEqual([]);
  });

  it('should include subspaces with read access', () => {
    const space = makeSpace('s1');
    const subspace = makeSpace('sub1', {
      levelZeroSpaceID: 's1',
      level: SpaceLevel.L1,
    });

    vi.mocked(mockAuthService.isAccessGranted).mockReturnValue(true);

    const result = getSpaceRolesForActorQueryResult(
      makeCredentialMap([
        ['s1', ['admin']],
        ['sub1', ['member']],
      ]),
      [space],
      [subspace],
      actorContext,
      mockAuthService
    );

    expect(result).toHaveLength(1);
    expect(result[0].subspaces).toHaveLength(1);
    expect(result[0].subspaces[0].id).toBe('sub1');
    expect(result[0].subspaces[0].roles).toEqual(['member']);
  });

  it('should skip subspaces without authorization', () => {
    const space = makeSpace('s1');
    const subspace = makeSpace('sub1', {
      hasAuth: false,
      levelZeroSpaceID: 's1',
      level: SpaceLevel.L1,
    });

    vi.mocked(mockAuthService.isAccessGranted).mockReturnValue(true);

    const result = getSpaceRolesForActorQueryResult(
      makeCredentialMap(),
      [space],
      [subspace],
      actorContext,
      mockAuthService
    );

    expect(result).toHaveLength(1);
    expect(result[0].subspaces).toEqual([]);
  });

  it('should skip subspaces where read access is not granted', () => {
    const space = makeSpace('s1');
    const subspace = makeSpace('sub1', {
      levelZeroSpaceID: 's1',
      level: SpaceLevel.L1,
    });

    vi.mocked(mockAuthService.isAccessGranted)
      .mockReturnValueOnce(true) // space read access
      .mockReturnValueOnce(false); // subspace read access

    const result = getSpaceRolesForActorQueryResult(
      makeCredentialMap(),
      [space],
      [subspace],
      actorContext,
      mockAuthService
    );

    expect(result).toHaveLength(1);
    expect(result[0].subspaces).toEqual([]);
  });

  it('should default to empty roles when credential map has no entry for a space', () => {
    const space = makeSpace('s1');
    vi.mocked(mockAuthService.isAccessGranted).mockReturnValue(true);

    const emptyMap: CredentialMap = new Map();

    const result = getSpaceRolesForActorQueryResult(
      emptyMap,
      [space],
      [],
      actorContext,
      mockAuthService
    );

    expect(result).toHaveLength(1);
    expect(result[0].roles).toEqual([]);
  });

  it('should handle multiple spaces with mixed access', () => {
    const space1 = makeSpace('s1');
    const space2 = makeSpace('s2');
    const space3 = makeSpace('s3', { hasAuth: false });

    vi.mocked(mockAuthService.isAccessGranted)
      .mockReturnValueOnce(true) // space1 granted
      .mockReturnValueOnce(false); // space2 denied

    const result = getSpaceRolesForActorQueryResult(
      makeCredentialMap(),
      [space1, space2, space3],
      [],
      actorContext,
      mockAuthService
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
  });
});
