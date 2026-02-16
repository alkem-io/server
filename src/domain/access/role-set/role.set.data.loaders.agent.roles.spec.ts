import { RoleName } from '@common/enums/role.name';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { RoleSetAgentRolesDataLoader } from './role.set.data.loaders.agent.roles';
import { IRoleSet } from './role.set.interface';
import { RoleSetCacheService } from './role.set.service.cache';
import { AgentRoleKey } from './types';

/* ───────── helpers ───────── */

function makeCredential(type: string, resourceID: string): ICredential {
  return { type, resourceID } as unknown as ICredential;
}

function makeRoleSet(
  id: string,
  roles?: Array<{
    name: RoleName;
    credential: { type: string; resourceID: string };
  }>
): IRoleSet {
  return {
    id,
    roles: roles?.map((r, i) => ({
      id: `role-${i}`,
      name: r.name,
      credential: r.credential,
    })),
  } as unknown as IRoleSet;
}

function makeKey(
  agentID: string,
  userID: string,
  roleSet: IRoleSet
): AgentRoleKey {
  return {
    agentInfo: { agentID, userID } as any,
    roleSet,
  };
}

/* ───────── mocks ───────── */

function createMocks() {
  const agentService: Mocked<Pick<AgentService, 'getAgentCredentialsBatch'>> = {
    getAgentCredentialsBatch: vi.fn().mockResolvedValue(new Map()),
  };

  const roleSetCacheService: Mocked<
    Pick<
      RoleSetCacheService,
      'getAgentRolesBatchFromCache' | 'setAgentRolesCache'
    >
  > = {
    getAgentRolesBatchFromCache: vi.fn().mockResolvedValue([]),
    setAgentRolesCache: vi.fn().mockResolvedValue(undefined),
  };

  const db = {
    query: {
      roleSets: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  };

  return { agentService, roleSetCacheService, db };
}

function createLoader(mocks: ReturnType<typeof createMocks>) {
  return new RoleSetAgentRolesDataLoader(
    mocks.agentService as unknown as AgentService,
    mocks.roleSetCacheService as unknown as RoleSetCacheService,
    mocks.db as unknown as DrizzleDb
  );
}

/* ═══════════════════════════════════════════════
   RoleSetAgentRolesDataLoader
   ═══════════════════════════════════════════════ */

describe('RoleSetAgentRolesDataLoader', () => {
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
  });

  /* ─── Empty agentID ─── */

  describe('empty agentID handling', () => {
    it('should return empty roles array for empty agentID', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(makeKey('', 'user-1', roleSet));

      expect(result).toEqual([]);
    });
  });

  /* ─── Cache hits ─── */

  describe('cache hits', () => {
    it('should return cached roles without computing', async () => {
      const roleSet = makeRoleSet('rs-1');
      const key = makeKey('agent-1', 'user-1', roleSet);

      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        [RoleName.MEMBER, RoleName.LEAD],
      ]);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toEqual([RoleName.MEMBER, RoleName.LEAD]);
      expect(
        mocks.roleSetCacheService.setAgentRolesCache
      ).not.toHaveBeenCalled();
    });
  });

  /* ─── matchRolesInMemory ─── */

  describe('in-memory role matching', () => {
    it('should match multiple roles the agent holds', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
        {
          name: RoleName.LEAD,
          credential: { type: 'space-lead', resourceID: 'space-1' },
        },
        {
          name: RoleName.ADMIN,
          credential: { type: 'space-admin', resourceID: 'space-1' },
        },
      ]);

      const creds = [
        makeCredential('space-member', 'space-1'),
        makeCredential('space-lead', 'space-1'),
        // No admin credential
      ];

      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', creds]])
      );
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
      ]);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toEqual([RoleName.MEMBER, RoleName.LEAD]);
      expect(result).not.toContain(RoleName.ADMIN);
    });

    it('should return empty array when no credentials match any role', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);

      const creds = [makeCredential('org-member', 'org-1')];

      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', creds]])
      );
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
      ]);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when agent has no credentials', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);

      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', []]])
      );
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
      ]);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when roleSet has no role definitions', async () => {
      const roleSet = makeRoleSet('rs-1', []);

      const creds = [makeCredential('space-member', 'space-1')];
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', creds]])
      );
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
      ]);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when credentials map has no entry for agent', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);

      // Agent not in the credentials map
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(new Map());
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
      ]);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toEqual([]);
      // Should NOT cache when there's no credentials entry
      expect(
        mocks.roleSetCacheService.setAgentRolesCache
      ).not.toHaveBeenCalled();
    });

    it('should match when credDef resourceID is empty (wildcard)', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'global-role', resourceID: '' },
        },
      ]);

      const creds = [makeCredential('global-role', 'any-resource-123')];
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', creds]])
      );
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
      ]);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toEqual([RoleName.MEMBER]);
    });

    it('should NOT match when credential resourceID is empty but credDef requires specific one', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);

      // Credential has empty resourceID, but role requires 'space-1'
      const creds = [makeCredential('space-member', '')];
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', creds]])
      );
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
      ]);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toEqual([]);
    });
  });

  /* ─── Caching behavior ─── */

  describe('caching', () => {
    it('should cache computed roles', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);

      const creds = [makeCredential('space-member', 'space-1')];
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', creds]])
      );
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
      ]);

      const loader = createLoader(mocks);
      await loader.loader.load(makeKey('agent-1', 'user-1', roleSet));

      expect(mocks.roleSetCacheService.setAgentRolesCache).toHaveBeenCalledWith(
        'agent-1',
        'rs-1',
        [RoleName.MEMBER]
      );
    });
  });

  /* ─── Batching behavior ─── */

  describe('batching', () => {
    it('should batch multiple loads and deduplicate agent credential fetches', async () => {
      const rs1 = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);
      const rs2 = makeRoleSet('rs-2', [
        {
          name: RoleName.LEAD,
          credential: { type: 'space-lead', resourceID: 'space-2' },
        },
      ]);

      const creds = [
        makeCredential('space-member', 'space-1'),
        makeCredential('space-lead', 'space-2'),
      ];
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', creds]])
      );
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
        undefined,
      ]);

      const loader = createLoader(mocks);
      const [roles1, roles2] = await Promise.all([
        loader.loader.load(makeKey('agent-1', 'user-1', rs1)),
        loader.loader.load(makeKey('agent-1', 'user-1', rs2)),
      ]);

      expect(roles1).toEqual([RoleName.MEMBER]);
      expect(roles2).toEqual([RoleName.LEAD]);
      expect(mocks.agentService.getAgentCredentialsBatch).toHaveBeenCalledTimes(
        1
      );
    });

    it('should handle mixed empty and valid agentIDs in one batch', async () => {
      const rs1 = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);
      const rs2 = makeRoleSet('rs-2', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-2' },
        },
      ]);

      const creds = [makeCredential('space-member', 'space-1')];
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', creds]])
      );
      // Only one entry for agent-1; the empty agent doesn't go through cache
      mocks.roleSetCacheService.getAgentRolesBatchFromCache.mockResolvedValue([
        undefined,
      ]);

      const loader = createLoader(mocks);
      const [roles1, roles2] = await Promise.all([
        loader.loader.load(makeKey('', 'user-anon', rs1)), // empty agentID
        loader.loader.load(makeKey('agent-1', 'user-1', rs2)),
      ]);

      expect(roles1).toEqual([]); // empty agent -> empty roles
      expect(roles2).toEqual([]); // agent-1 has space-1 cred, not space-2
    });
  });
});
