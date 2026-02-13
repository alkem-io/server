import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleName } from '@common/enums/role.name';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';
import { type Mocked, vi, describe, it, expect, beforeEach } from 'vitest';
import { RoleSetCacheService } from './role.set.service.cache';

/* ───────── helpers ───────── */

function createMockCacheManager(supportMget: boolean): Mocked<Cache> {
  const store: any = {};
  if (supportMget) {
    store.mget = vi.fn();
  }
  return {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockImplementation((_key, value) => Promise.resolve(value)),
    del: vi.fn().mockResolvedValue(undefined),
    store,
  } as unknown as Mocked<Cache>;
}

function createMockConfigService(): Partial<ConfigService> {
  return {
    get: vi.fn().mockReturnValue(300), // 300s TTL
  } as any;
}

/* ═══════════════════════════════════════════════
   RoleSetCacheService
   ═══════════════════════════════════════════════ */

describe('RoleSetCacheService', () => {
  let service: RoleSetCacheService;
  let cacheManager: Mocked<Cache>;

  async function createService(supportMget = true) {
    cacheManager = createMockCacheManager(supportMget);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetCacheService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: ConfigService, useValue: createMockConfigService() },
      ],
    }).compile();

    service = module.get(RoleSetCacheService);
  }

  beforeEach(async () => {
    await createService(true);
  });

  /* ─── Key generation (tested via set/get round-trip) ─── */

  describe('cache key generation', () => {
    it('should generate distinct keys for membership status', async () => {
      await service.setMembershipStatusCache(
        'agent-1',
        'rs-1',
        CommunityMembershipStatus.MEMBER
      );

      expect(cacheManager.set).toHaveBeenCalledWith(
        'membershipStatus:agent-1:rs-1',
        CommunityMembershipStatus.MEMBER,
        { ttl: 300 }
      );
    });

    it('should generate distinct keys for agent roles', async () => {
      await service.setAgentRolesCache('agent-1', 'rs-1', [RoleName.MEMBER]);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'agentRoles:agent-1:rs-1',
        [RoleName.MEMBER],
        { ttl: 300 }
      );
    });

    it('should generate distinct keys for isMember', async () => {
      await service.setAgentIsMemberCache('agent-1', 'rs-1', true);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'isMember:agent-1:rs-1',
        true,
        { ttl: 300 }
      );
    });
  });

  /* ─── Batch retrieval with mget ─── */

  describe('batch cache retrieval (mget available)', () => {
    it('should use mget for agent roles batch', async () => {
      const entries = [
        { agentId: 'a1', roleSetId: 'rs-1' },
        { agentId: 'a2', roleSetId: 'rs-2' },
      ];

      cacheManager.store.mget!.mockResolvedValue([
        [RoleName.MEMBER],
        undefined,
      ]);

      const results = await service.getAgentRolesBatchFromCache(entries);

      expect(cacheManager.store.mget).toHaveBeenCalledWith(
        'agentRoles:a1:rs-1',
        'agentRoles:a2:rs-2'
      );
      expect(results).toEqual([[RoleName.MEMBER], undefined]);
    });

    it('should use mget for membership status batch', async () => {
      const entries = [
        { agentId: 'a1', roleSetId: 'rs-1' },
        { agentId: 'a2', roleSetId: 'rs-2' },
      ];

      cacheManager.store.mget!.mockResolvedValue([
        CommunityMembershipStatus.MEMBER,
        CommunityMembershipStatus.NOT_MEMBER,
      ]);

      const results =
        await service.getMembershipStatusBatchFromCache(entries);

      expect(results).toEqual([
        CommunityMembershipStatus.MEMBER,
        CommunityMembershipStatus.NOT_MEMBER,
      ]);
    });

    it('should return empty array for empty entries', async () => {
      const results = await service.getAgentRolesBatchFromCache([]);

      expect(cacheManager.store.mget).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });
  });

  /* ─── Batch retrieval without mget (fallback) ─── */

  describe('batch cache retrieval (mget NOT available)', () => {
    beforeEach(async () => {
      await createService(false);
    });

    it('should fall back to sequential gets', async () => {
      const entries = [
        { agentId: 'a1', roleSetId: 'rs-1' },
        { agentId: 'a2', roleSetId: 'rs-2' },
      ];

      cacheManager.get
        .mockResolvedValueOnce([RoleName.LEAD] as any)
        .mockResolvedValueOnce(undefined as any);

      const results = await service.getAgentRolesBatchFromCache(entries);

      expect(cacheManager.get).toHaveBeenCalledTimes(2);
      expect(cacheManager.get).toHaveBeenCalledWith('agentRoles:a1:rs-1');
      expect(cacheManager.get).toHaveBeenCalledWith('agentRoles:a2:rs-2');
      expect(results).toEqual([[RoleName.LEAD], undefined]);
    });
  });

  /* ─── appendAgentRoleCache ─── */

  describe('appendAgentRoleCache', () => {
    it('should return undefined when no cached roles exist', async () => {
      cacheManager.get.mockResolvedValue(undefined as any);

      const result = await service.appendAgentRoleCache(
        'agent-1',
        'rs-1',
        RoleName.LEAD
      );

      expect(result).toBeUndefined();
      // Should not attempt to set
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should append a new role to existing cached roles', async () => {
      cacheManager.get.mockResolvedValue([RoleName.MEMBER] as any);

      const result = await service.appendAgentRoleCache(
        'agent-1',
        'rs-1',
        RoleName.LEAD
      );

      expect(result).toEqual([RoleName.MEMBER, RoleName.LEAD]);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'agentRoles:agent-1:rs-1',
        [RoleName.MEMBER, RoleName.LEAD],
        { ttl: 300 }
      );
    });

    it('should not duplicate an already-existing role', async () => {
      cacheManager.get.mockResolvedValue([RoleName.MEMBER, RoleName.LEAD] as any);

      const result = await service.appendAgentRoleCache(
        'agent-1',
        'rs-1',
        RoleName.MEMBER
      );

      expect(result).toEqual([RoleName.MEMBER, RoleName.LEAD]);
      // Should not call set since no change needed
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  /* ─── cleanAgentMembershipCache ─── */

  describe('cleanAgentMembershipCache', () => {
    it('should delete all three related cache keys', async () => {
      await service.cleanAgentMembershipCache('agent-1', 'rs-1');

      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.del).toHaveBeenCalledWith(
        'membershipStatus:agent-1:rs-1'
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        'agentRoles:agent-1:rs-1'
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        'isMember:agent-1:rs-1'
      );
    });
  });

  /* ─── Individual get/set/delete methods ─── */

  describe('individual cache operations', () => {
    it('should get membership status from cache', async () => {
      cacheManager.get.mockResolvedValue(CommunityMembershipStatus.MEMBER as any);

      const result = await service.getMembershipStatusFromCache(
        'agent-1',
        'rs-1'
      );

      expect(cacheManager.get).toHaveBeenCalledWith(
        'membershipStatus:agent-1:rs-1'
      );
      expect(result).toBe(CommunityMembershipStatus.MEMBER);
    });

    it('should return undefined for cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined as any);

      const result = await service.getAgentRolesFromCache('agent-1', 'rs-1');

      expect(result).toBeUndefined();
    });

    it('should delete membership status from cache', async () => {
      await service.deleteMembershipStatusCache('agent-1', 'rs-1');

      expect(cacheManager.del).toHaveBeenCalledWith(
        'membershipStatus:agent-1:rs-1'
      );
    });

    it('should delete open invitation from cache', async () => {
      await service.deleteOpenInvitationFromCache('user-1', 'rs-1');

      expect(cacheManager.del).toHaveBeenCalledWith(
        'openInvitation:user-1:rs-1'
      );
    });

    it('should delete open application from cache', async () => {
      await service.deleteOpenApplicationFromCache('user-1', 'rs-1');

      expect(cacheManager.del).toHaveBeenCalledWith(
        'openApplication:user-1:rs-1'
      );
    });
  });
});
