import { RoleName } from '@common/enums/role.name';
import { type Mocked, vi } from 'vitest';
import { RoleSetActorRolesDataLoader } from './role.set.data.loaders.actor.roles';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';
import { ActorRoleKey } from './types';

function makeKey(
  actorID: string,
  userID: string,
  roleSetId: string
): ActorRoleKey {
  return {
    actorContext: { actorID, userID } as any,
    roleSet: { id: roleSetId } as unknown as IRoleSet,
  };
}

describe('RoleSetActorRolesDataLoader', () => {
  let loader: RoleSetActorRolesDataLoader;
  let roleSetService: Mocked<Pick<RoleSetService, 'getRolesForActorContext'>>;

  beforeEach(() => {
    roleSetService = {
      getRolesForActorContext: vi.fn().mockResolvedValue([]),
    };
    loader = new RoleSetActorRolesDataLoader(
      roleSetService as unknown as RoleSetService
    );
  });

  it('should be defined', () => {
    expect(loader).toBeDefined();
    expect(loader.loader).toBeDefined();
  });

  it('should call getRolesForActorContext for each key', async () => {
    roleSetService.getRolesForActorContext
      .mockResolvedValueOnce([RoleName.MEMBER])
      .mockResolvedValueOnce([RoleName.MEMBER, RoleName.LEAD]);

    const [result1, result2] = await Promise.all([
      loader.loader.load(makeKey('agent-1', 'user-1', 'rs-1')),
      loader.loader.load(makeKey('agent-2', 'user-2', 'rs-2')),
    ]);

    expect(result1).toEqual([RoleName.MEMBER]);
    expect(result2).toEqual([RoleName.MEMBER, RoleName.LEAD]);
    expect(roleSetService.getRolesForActorContext).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate keys with same actorID and roleSetId', async () => {
    roleSetService.getRolesForActorContext.mockResolvedValue([RoleName.MEMBER]);

    const [result1, result2] = await Promise.all([
      loader.loader.load(makeKey('agent-1', 'user-1', 'rs-1')),
      loader.loader.load(makeKey('agent-1', 'user-1', 'rs-1')),
    ]);

    expect(result1).toEqual([RoleName.MEMBER]);
    expect(result2).toEqual([RoleName.MEMBER]);
    // DataLoader deduplicates, so only one call
    expect(roleSetService.getRolesForActorContext).toHaveBeenCalledTimes(1);
  });

  it('should return empty array for unknown actors', async () => {
    roleSetService.getRolesForActorContext.mockResolvedValue([]);

    const result = await loader.loader.load(
      makeKey('unknown', 'user-1', 'rs-1')
    );

    expect(result).toEqual([]);
  });
});
