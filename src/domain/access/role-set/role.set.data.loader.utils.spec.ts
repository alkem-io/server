import { AgentService } from '@domain/agent/agent/agent.service';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { In, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import {
  ensureRolesLoaded,
  loadAgentCredentials,
} from './role.set.data.loader.utils';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { AgentRoleKey } from './types';

/* ───────── helpers ───────── */

function makeAgentRoleKey(
  agentID: string,
  userID: string,
  roleSetId: string,
  roles?: any[]
): AgentRoleKey {
  return {
    agentInfo: { agentID, userID } as any,
    roleSet: { id: roleSetId, roles } as unknown as IRoleSet,
  };
}

function makeCredential(type: string, resourceID: string): ICredential {
  return { type, resourceID } as unknown as ICredential;
}

/* ═══════════════════════════════════════════════
   loadAgentCredentials
   ═══════════════════════════════════════════════ */

describe('loadAgentCredentials', () => {
  let agentService: Mocked<Pick<AgentService, 'getAgentCredentialsBatch'>>;

  beforeEach(() => {
    agentService = {
      getAgentCredentialsBatch: vi.fn().mockResolvedValue(new Map()),
    };
  });

  it('should deduplicate agent IDs across keys', async () => {
    const keys: AgentRoleKey[] = [
      makeAgentRoleKey('agent-1', 'user-1', 'rs-1'),
      makeAgentRoleKey('agent-1', 'user-1', 'rs-2'),
      makeAgentRoleKey('agent-1', 'user-1', 'rs-3'),
    ];

    await loadAgentCredentials(keys, agentService as unknown as AgentService);

    expect(agentService.getAgentCredentialsBatch).toHaveBeenCalledTimes(1);
    expect(agentService.getAgentCredentialsBatch).toHaveBeenCalledWith([
      'agent-1',
    ]);
  });

  it('should pass multiple unique agent IDs', async () => {
    const keys: AgentRoleKey[] = [
      makeAgentRoleKey('agent-1', 'user-1', 'rs-1'),
      makeAgentRoleKey('agent-2', 'user-2', 'rs-2'),
      makeAgentRoleKey('agent-1', 'user-1', 'rs-3'),
    ];

    await loadAgentCredentials(keys, agentService as unknown as AgentService);

    const passedIds = agentService.getAgentCredentialsBatch.mock.calls[0][0];
    expect(passedIds).toHaveLength(2);
    expect(passedIds).toContain('agent-1');
    expect(passedIds).toContain('agent-2');
  });

  it('should filter out empty agent IDs', async () => {
    const keys: AgentRoleKey[] = [
      makeAgentRoleKey('', 'user-1', 'rs-1'),
      makeAgentRoleKey('agent-2', 'user-2', 'rs-2'),
      makeAgentRoleKey('', 'user-3', 'rs-3'),
    ];

    await loadAgentCredentials(keys, agentService as unknown as AgentService);

    expect(agentService.getAgentCredentialsBatch).toHaveBeenCalledWith([
      'agent-2',
    ]);
  });

  it('should return empty map when all agent IDs are empty', async () => {
    const keys: AgentRoleKey[] = [
      makeAgentRoleKey('', 'user-1', 'rs-1'),
      makeAgentRoleKey('', 'user-2', 'rs-2'),
    ];

    // When no valid IDs, getAgentCredentialsBatch([]) returns empty map
    agentService.getAgentCredentialsBatch.mockResolvedValue(new Map());

    const result = await loadAgentCredentials(
      keys,
      agentService as unknown as AgentService
    );

    expect(result.size).toBe(0);
  });

  it('should return the map from agentService', async () => {
    const cred = makeCredential('space-member', 'space-123');
    const expected = new Map([['agent-1', [cred]]]);
    agentService.getAgentCredentialsBatch.mockResolvedValue(expected);

    const keys: AgentRoleKey[] = [
      makeAgentRoleKey('agent-1', 'user-1', 'rs-1'),
    ];

    const result = await loadAgentCredentials(
      keys,
      agentService as unknown as AgentService
    );

    expect(result).toBe(expected);
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
