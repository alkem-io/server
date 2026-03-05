import { ActorService } from '@domain/actor/actor/actor.service';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { In, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import {
  ensureRolesLoaded,
  loadActorCredentials,
} from './role.set.data.loader.utils';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { ActorRoleKey } from './types';

/* ───────── helpers ───────── */

function makeActorRoleKey(
  actorID: string,
  userID: string,
  roleSetId: string,
  roles?: any[]
): ActorRoleKey {
  return {
    actorContext: { actorID, userID } as any,
    roleSet: { id: roleSetId, roles } as unknown as IRoleSet,
  };
}

function makeCredential(type: string, resourceID: string): ICredential {
  return { type, resourceID } as unknown as ICredential;
}

/* ═══════════════════════════════════════════════
   loadActorCredentials
   ═══════════════════════════════════════════════ */

describe('loadActorCredentials', () => {
  let actorService: Mocked<Pick<ActorService, 'getActorCredentials'>>;

  beforeEach(() => {
    actorService = {
      getActorCredentials: vi
        .fn()
        .mockImplementation(async (actorID: string) => ({
          actor: { id: actorID },
          credentials: [],
        })),
    };
  });

  it('should deduplicate agent IDs across keys', async () => {
    const keys: ActorRoleKey[] = [
      makeActorRoleKey('agent-1', 'user-1', 'rs-1'),
      makeActorRoleKey('agent-1', 'user-1', 'rs-2'),
      makeActorRoleKey('agent-1', 'user-1', 'rs-3'),
    ];

    await loadActorCredentials(keys, actorService as unknown as ActorService);

    expect(actorService.getActorCredentials).toHaveBeenCalledTimes(1);
    expect(actorService.getActorCredentials).toHaveBeenCalledWith('agent-1');
  });

  it('should pass multiple unique agent IDs', async () => {
    const keys: ActorRoleKey[] = [
      makeActorRoleKey('agent-1', 'user-1', 'rs-1'),
      makeActorRoleKey('agent-2', 'user-2', 'rs-2'),
      makeActorRoleKey('agent-1', 'user-1', 'rs-3'),
    ];

    await loadActorCredentials(keys, actorService as unknown as ActorService);

    expect(actorService.getActorCredentials).toHaveBeenCalledTimes(2);
    const calledWith = actorService.getActorCredentials.mock.calls.map(
      c => c[0]
    );
    expect(calledWith).toContain('agent-1');
    expect(calledWith).toContain('agent-2');
  });

  it('should filter out empty agent IDs', async () => {
    const keys: ActorRoleKey[] = [
      makeActorRoleKey('', 'user-1', 'rs-1'),
      makeActorRoleKey('agent-2', 'user-2', 'rs-2'),
      makeActorRoleKey('', 'user-3', 'rs-3'),
    ];

    await loadActorCredentials(keys, actorService as unknown as ActorService);

    expect(actorService.getActorCredentials).toHaveBeenCalledTimes(1);
    expect(actorService.getActorCredentials).toHaveBeenCalledWith('agent-2');
  });

  it('should return empty map when all agent IDs are empty', async () => {
    const keys: ActorRoleKey[] = [
      makeActorRoleKey('', 'user-1', 'rs-1'),
      makeActorRoleKey('', 'user-2', 'rs-2'),
    ];

    const result = await loadActorCredentials(
      keys,
      actorService as unknown as ActorService
    );

    expect(result.size).toBe(0);
    expect(actorService.getActorCredentials).not.toHaveBeenCalled();
  });

  it('should return the map from actorService', async () => {
    const cred = makeCredential('space-member', 'space-123');
    actorService.getActorCredentials.mockImplementation(
      async (actorID: string) => ({
        actor: { id: actorID } as any,
        credentials: [cred],
      })
    );

    const keys: ActorRoleKey[] = [
      makeActorRoleKey('agent-1', 'user-1', 'rs-1'),
    ];

    const result = await loadActorCredentials(
      keys,
      actorService as unknown as ActorService
    );

    expect(result.get('agent-1')).toEqual([cred]);
  });
});

/* ═══════════════════════════════════════════════
   ensureRolesLoaded
   ═══════════════════════════════════════════════ */

describe('ensureRolesLoaded', () => {
  let roleSetRepository: Mocked<Pick<Repository<RoleSet>, 'find'>>;

  beforeEach(() => {
    roleSetRepository = {
      find: vi.fn().mockResolvedValue([]),
    };
  });

  it('should skip DB query when all roleSets already have roles', async () => {
    const roleSets: IRoleSet[] = [
      { id: 'rs-1', roles: [{ id: 'role-1', name: 'member' }] } as any,
      { id: 'rs-2', roles: [{ id: 'role-2', name: 'lead' }] } as any,
    ];

    await ensureRolesLoaded(
      roleSets,
      roleSetRepository as unknown as Repository<RoleSet>
    );

    expect(roleSetRepository.find).not.toHaveBeenCalled();
  });

  it('should fetch roles for roleSets with undefined roles', async () => {
    const rs1: IRoleSet = { id: 'rs-1', roles: undefined } as any;
    const rs2: IRoleSet = {
      id: 'rs-2',
      roles: [{ id: 'role-2', name: 'lead' }],
    } as any;

    const loadedRoles = [{ id: 'role-1', name: 'member' }];
    roleSetRepository.find.mockResolvedValue([
      { id: 'rs-1', roles: loadedRoles } as any,
    ]);

    await ensureRolesLoaded(
      [rs1, rs2],
      roleSetRepository as unknown as Repository<RoleSet>
    );

    expect(roleSetRepository.find).toHaveBeenCalledTimes(1);
    expect(roleSetRepository.find).toHaveBeenCalledWith({
      where: { id: In(['rs-1']) },
      relations: { roles: true },
    });
    // Mutates in place
    expect(rs1.roles).toEqual(loadedRoles);
    // Already-loaded roleSet untouched
    expect(rs2.roles).toHaveLength(1);
  });

  it('should deduplicate roleSet IDs for the query', async () => {
    const rs1: IRoleSet = { id: 'rs-1', roles: undefined } as any;
    const rs2: IRoleSet = { id: 'rs-1', roles: undefined } as any; // same ID, different ref

    const loadedRoles = [{ id: 'role-1', name: 'member' }];
    roleSetRepository.find.mockResolvedValue([
      { id: 'rs-1', roles: loadedRoles } as any,
    ]);

    await ensureRolesLoaded(
      [rs1, rs2],
      roleSetRepository as unknown as Repository<RoleSet>
    );

    // Should only query with unique IDs
    expect(roleSetRepository.find).toHaveBeenCalledWith({
      where: { id: In(['rs-1']) },
      relations: { roles: true },
    });
    // Both references should be hydrated
    expect(rs1.roles).toEqual(loadedRoles);
    expect(rs2.roles).toEqual(loadedRoles);
  });

  it('should handle empty input array', async () => {
    await ensureRolesLoaded(
      [],
      roleSetRepository as unknown as Repository<RoleSet>
    );

    expect(roleSetRepository.find).not.toHaveBeenCalled();
  });

  it('should handle roleSet not found in DB (sets undefined)', async () => {
    const rs1: IRoleSet = { id: 'rs-missing', roles: undefined } as any;

    roleSetRepository.find.mockResolvedValue([]);

    await ensureRolesLoaded(
      [rs1],
      roleSetRepository as unknown as Repository<RoleSet>
    );

    // rolesById.get('rs-missing') returns undefined
    expect(rs1.roles).toBeUndefined();
  });
});
