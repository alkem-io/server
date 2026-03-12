import { AuthorizationPrivilege } from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Space } from '@domain/space/space/space.entity';
import { createMock } from '@golevelup/ts-vitest';
import { getSpaceRolesForContributorQueryResult } from './get.space.roles.for.contributor.query.result';
import {
  type CredentialMap,
  type CredentialRole,
} from './group.credentials.by.entity';

function makeSpace(
  id: string,
  level: SpaceLevel,
  displayName: string,
  levelZeroSpaceID?: string
): Space {
  return {
    id,
    nameID: `name-${id}`,
    level,
    levelZeroSpaceID: levelZeroSpaceID ?? id,
    visibility: SpaceVisibility.ACTIVE,
    about: {
      profile: {
        displayName,
      },
    },
    authorization: { id: `auth-${id}` },
  } as unknown as Space;
}

function makeCredentialMap(
  spaceRoles: Record<string, CredentialRole[]>
): CredentialMap {
  const map: CredentialMap = new Map();
  const spacesMap = new Map<string, CredentialRole[]>();
  for (const [spaceId, roles] of Object.entries(spaceRoles)) {
    spacesMap.set(spaceId, roles);
  }
  map.set('spaces', spacesMap);
  return map;
}

describe('getSpaceRolesForContributorQueryResult', () => {
  let authService: AuthorizationService;
  const actorContext = { actorID: 'user-1' } as ActorContext;

  beforeEach(() => {
    authService = createMock<AuthorizationService>();
    (authService.isAccessGranted as any).mockReturnValue(true);
  });

  it('should return roles for a single space', () => {
    const spaces = [makeSpace('s1', SpaceLevel.L0, 'Space 1')];
    const credMap = makeCredentialMap({
      s1: [RoleName.MEMBER, RoleName.ADMIN],
    });

    const results = getSpaceRolesForContributorQueryResult(
      credMap,
      spaces,
      [],
      actorContext,
      authService
    );

    expect(results).toHaveLength(1);
    expect(results[0].spaceID).toBe('s1');
    expect(results[0].roles).toEqual([RoleName.MEMBER, RoleName.ADMIN]);
  });

  it('should include subspaces under their parent space', () => {
    const spaces = [makeSpace('s1', SpaceLevel.L0, 'Space 1')];
    const subspaces = [
      makeSpace('sub1', SpaceLevel.L1, 'Subspace 1', 's1'),
      makeSpace('sub2', SpaceLevel.L1, 'Subspace 2', 's1'),
    ];
    const credMap = makeCredentialMap({
      s1: [RoleName.MEMBER],
      sub1: [RoleName.MEMBER],
      sub2: [RoleName.ADMIN],
    });

    const results = getSpaceRolesForContributorQueryResult(
      credMap,
      spaces,
      subspaces,
      actorContext,
      authService
    );

    expect(results).toHaveLength(1);
    expect(results[0].subspaces).toHaveLength(2);
    expect(results[0].subspaces[0].roles).toEqual([RoleName.MEMBER]);
    expect(results[0].subspaces[1].roles).toEqual([RoleName.ADMIN]);
  });

  it('should filter out spaces without READ_ABOUT access', () => {
    const spaces = [
      makeSpace('s1', SpaceLevel.L0, 'Space 1'),
      makeSpace('s2', SpaceLevel.L0, 'Space 2'),
    ];
    const credMap = makeCredentialMap({
      s1: [RoleName.MEMBER],
      s2: [RoleName.MEMBER],
    });

    (authService.isAccessGranted as any).mockImplementation(
      (
        _actorContext: any,
        authorization: any,
        _privilege: AuthorizationPrivilege
      ) => {
        return authorization.id !== 'auth-s2';
      }
    );

    const results = getSpaceRolesForContributorQueryResult(
      credMap,
      spaces,
      [],
      actorContext,
      authService
    );

    expect(results).toHaveLength(1);
    expect(results[0].spaceID).toBe('s1');
  });

  it('should skip spaces without authorization', () => {
    const spaceNoAuth = makeSpace('s1', SpaceLevel.L0, 'Space 1');
    (spaceNoAuth as any).authorization = undefined;
    const credMap = makeCredentialMap({ s1: [RoleName.MEMBER] });

    const results = getSpaceRolesForContributorQueryResult(
      credMap,
      [spaceNoAuth],
      [],
      actorContext,
      authService
    );

    // Space without authorization is filtered out (returns undefined from map, then filtered)
    expect(results).toHaveLength(0);
  });

  it('should skip subspaces without authorization', () => {
    const spaces = [makeSpace('s1', SpaceLevel.L0, 'Space 1')];
    const subNoAuth = makeSpace('sub1', SpaceLevel.L1, 'Subspace 1', 's1');
    (subNoAuth as any).authorization = undefined;
    const credMap = makeCredentialMap({
      s1: [RoleName.MEMBER],
      sub1: [RoleName.MEMBER],
    });

    const results = getSpaceRolesForContributorQueryResult(
      credMap,
      spaces,
      [subNoAuth],
      actorContext,
      authService
    );

    expect(results).toHaveLength(1);
    expect(results[0].subspaces).toHaveLength(0);
  });

  it('should skip subspaces without READ_ABOUT access', () => {
    const spaces = [makeSpace('s1', SpaceLevel.L0, 'Space 1')];
    const subspaces = [
      makeSpace('sub1', SpaceLevel.L1, 'Subspace 1', 's1'),
      makeSpace('sub2', SpaceLevel.L1, 'Subspace 2', 's1'),
    ];
    const credMap = makeCredentialMap({
      s1: [RoleName.MEMBER],
      sub1: [RoleName.MEMBER],
      sub2: [RoleName.MEMBER],
    });

    (authService.isAccessGranted as any).mockImplementation(
      (
        _actorContext: any,
        authorization: any,
        _privilege: AuthorizationPrivilege
      ) => {
        return authorization.id !== 'auth-sub2';
      }
    );

    const results = getSpaceRolesForContributorQueryResult(
      credMap,
      spaces,
      subspaces,
      actorContext,
      authService
    );

    expect(results).toHaveLength(1);
    expect(results[0].subspaces).toHaveLength(1);
    expect(results[0].subspaces[0].id).toBe('sub1');
  });

  it('should return empty roles when credential map has no entry', () => {
    const spaces = [makeSpace('s1', SpaceLevel.L0, 'Space 1')];
    const credMap = makeCredentialMap({});

    const results = getSpaceRolesForContributorQueryResult(
      credMap,
      spaces,
      [],
      actorContext,
      authService
    );

    expect(results).toHaveLength(1);
    expect(results[0].roles).toEqual([]);
  });

  it('should return empty array when no spaces provided', () => {
    const credMap = makeCredentialMap({});

    const results = getSpaceRolesForContributorQueryResult(
      credMap,
      [],
      [],
      actorContext,
      authService
    );

    expect(results).toHaveLength(0);
  });

  it('should handle space with no subspaces in its group', () => {
    const spaces = [makeSpace('s1', SpaceLevel.L0, 'Space 1')];
    const subspaces = [
      makeSpace('sub1', SpaceLevel.L1, 'Subspace 1', 'other-space'),
    ];
    const credMap = makeCredentialMap({
      s1: [RoleName.MEMBER],
      sub1: [RoleName.MEMBER],
    });

    const results = getSpaceRolesForContributorQueryResult(
      credMap,
      spaces,
      subspaces,
      actorContext,
      authService
    );

    expect(results).toHaveLength(1);
    expect(results[0].subspaces).toHaveLength(0);
  });
});
