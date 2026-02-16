import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleName } from '@common/enums/role.name';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { InvitationService } from '../invitation/invitation.service';
import { RoleSetMembershipStatusDataLoader } from './role.set.data.loader.membership.status';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';
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
      'getMembershipStatusBatchFromCache' | 'setMembershipStatusCache'
    >
  > = {
    getMembershipStatusBatchFromCache: vi.fn().mockResolvedValue([]),
    setMembershipStatusCache: vi.fn().mockResolvedValue(undefined),
  };

  const roleSetService: Mocked<
    Pick<RoleSetService, 'findOpenApplication' | 'findOpenInvitation'>
  > = {
    findOpenApplication: vi.fn().mockResolvedValue(undefined),
    findOpenInvitation: vi.fn().mockResolvedValue(undefined),
  };

  const invitationService: Mocked<
    Pick<InvitationService, 'canAcceptInvitation'>
  > = {
    canAcceptInvitation: vi.fn().mockReturnValue(false),
  };

  const roleSetRepository: Mocked<Pick<Repository<RoleSet>, 'find'>> = {
    find: vi.fn().mockResolvedValue([]),
  };

  return {
    agentService,
    roleSetCacheService,
    roleSetService,
    invitationService,
    roleSetRepository,
  };
}

function createLoader(mocks: ReturnType<typeof createMocks>) {
  return new RoleSetMembershipStatusDataLoader(
    mocks.agentService as unknown as AgentService,
    mocks.roleSetCacheService as unknown as RoleSetCacheService,
    mocks.roleSetService as unknown as RoleSetService,
    mocks.invitationService as unknown as InvitationService,
    mocks.roleSetRepository as unknown as Repository<RoleSet>
  );
}

/* ═══════════════════════════════════════════════
   RoleSetMembershipStatusDataLoader
   ═══════════════════════════════════════════════ */

describe('RoleSetMembershipStatusDataLoader', () => {
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
  });

  /* ─── Empty agentID ─── */

  describe('empty agentID handling', () => {
    it('should return NOT_MEMBER immediately for empty agentID', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);
      const key = makeKey('', 'user-1', roleSet);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toBe(CommunityMembershipStatus.NOT_MEMBER);
      // Should not check cache for empty agent
      expect(
        mocks.roleSetCacheService.getMembershipStatusBatchFromCache
      ).toHaveBeenCalledWith([]);
    });
  });

  /* ─── Cache hits ─── */

  describe('cache hits', () => {
    it('should return cached membership status without computing', async () => {
      const roleSet = makeRoleSet('rs-1');
      const key = makeKey('agent-1', 'user-1', roleSet);

      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(new Map());
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [CommunityMembershipStatus.MEMBER]
      );

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toBe(CommunityMembershipStatus.MEMBER);
      // Should not try to set cache or check applications
      expect(
        mocks.roleSetCacheService.setMembershipStatusCache
      ).not.toHaveBeenCalled();
      expect(mocks.roleSetService.findOpenApplication).not.toHaveBeenCalled();
    });
  });

  /* ─── In-memory membership check ─── */

  describe('isMemberInMemory', () => {
    it('should detect member via credential match', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);
      const key = makeKey('agent-1', 'user-1', roleSet);

      const cred = makeCredential('space-member', 'space-1');
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', [cred]]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined]
      );

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toBe(CommunityMembershipStatus.MEMBER);
      expect(
        mocks.roleSetCacheService.setMembershipStatusCache
      ).toHaveBeenCalledWith(
        'agent-1',
        'rs-1',
        CommunityMembershipStatus.MEMBER
      );
    });

    it('should not match when credential type differs', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);
      const key = makeKey('agent-1', 'user-1', roleSet);

      const cred = makeCredential('org-member', 'space-1');
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', [cred]]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined]
      );

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toBe(CommunityMembershipStatus.NOT_MEMBER);
    });

    it('should not match when resourceID differs', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);
      const key = makeKey('agent-1', 'user-1', roleSet);

      const cred = makeCredential('space-member', 'space-OTHER');
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', [cred]]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined]
      );

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toBe(CommunityMembershipStatus.NOT_MEMBER);
    });

    it('should match any resourceID when credDef resourceID is falsy', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: '' },
        },
      ]);
      const key = makeKey('agent-1', 'user-1', roleSet);

      const cred = makeCredential('space-member', 'any-resource');
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', [cred]]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined]
      );

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toBe(CommunityMembershipStatus.MEMBER);
    });

    it('should return NOT_MEMBER when roleSet has no roles', async () => {
      const roleSet = makeRoleSet('rs-1', []);
      const key = makeKey('agent-1', 'user-1', roleSet);

      const cred = makeCredential('space-member', 'space-1');
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', [cred]]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined]
      );

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toBe(CommunityMembershipStatus.NOT_MEMBER);
    });

    it('should return NOT_MEMBER when roleSet has no MEMBER role', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.LEAD,
          credential: { type: 'space-lead', resourceID: 'space-1' },
        },
      ]);
      const key = makeKey('agent-1', 'user-1', roleSet);

      const cred = makeCredential('space-lead', 'space-1');
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', [cred]]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined]
      );

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      // Even though the agent has the LEAD credential, the isMemberInMemory
      // check only looks for the MEMBER role
      expect(result).toBe(CommunityMembershipStatus.NOT_MEMBER);
    });

    it('should return NOT_MEMBER when agent has no credentials', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);
      const key = makeKey('agent-1', 'user-1', roleSet);

      // Agent exists but has no credentials
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', []]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined]
      );

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toBe(CommunityMembershipStatus.NOT_MEMBER);
    });

    it('should return NOT_MEMBER when agent is not in credentials map', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);
      const key = makeKey('agent-1', 'user-1', roleSet);

      // Agent not in the map at all
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(new Map());
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined]
      );

      const loader = createLoader(mocks);
      const result = await loader.loader.load(key);

      expect(result).toBe(CommunityMembershipStatus.NOT_MEMBER);
    });
  });

  /* ─── Non-member status resolution ─── */

  describe('resolveNonMemberStatus', () => {
    let roleSet: IRoleSet;

    beforeEach(() => {
      roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'space-1' },
        },
      ]);
      // Agent has NO matching credentials → triggers non-member path
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', []]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined]
      );
    });

    it('should return APPLICATION_PENDING when open application exists', async () => {
      mocks.roleSetService.findOpenApplication.mockResolvedValue({
        id: 'app-1',
      } as any);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toBe(CommunityMembershipStatus.APPLICATION_PENDING);
    });

    it('should return INVITATION_PENDING when open invitation exists and can be accepted', async () => {
      mocks.roleSetService.findOpenApplication.mockResolvedValue(undefined);
      mocks.roleSetService.findOpenInvitation.mockResolvedValue({
        id: 'inv-1',
      } as any);
      mocks.invitationService.canAcceptInvitation.mockReturnValue(true);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toBe(CommunityMembershipStatus.INVITATION_PENDING);
    });

    it('should return NOT_MEMBER when invitation exists but cannot be accepted', async () => {
      mocks.roleSetService.findOpenApplication.mockResolvedValue(undefined);
      mocks.roleSetService.findOpenInvitation.mockResolvedValue({
        id: 'inv-1',
      } as any);
      mocks.invitationService.canAcceptInvitation.mockReturnValue(false);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toBe(CommunityMembershipStatus.NOT_MEMBER);
    });

    it('should return NOT_MEMBER when no application or invitation exists', async () => {
      mocks.roleSetService.findOpenApplication.mockResolvedValue(undefined);
      mocks.roleSetService.findOpenInvitation.mockResolvedValue(undefined);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      expect(result).toBe(CommunityMembershipStatus.NOT_MEMBER);
    });

    it('should prioritize application over invitation', async () => {
      // Both exist, but application takes precedence
      mocks.roleSetService.findOpenApplication.mockResolvedValue({
        id: 'app-1',
      } as any);
      mocks.roleSetService.findOpenInvitation.mockResolvedValue({
        id: 'inv-1',
      } as any);
      mocks.invitationService.canAcceptInvitation.mockReturnValue(true);

      const loader = createLoader(mocks);
      const result = await loader.loader.load(
        makeKey('agent-1', 'user-1', roleSet)
      );

      // Application and invitation are fetched in parallel, but application takes precedence
      expect(result).toBe(CommunityMembershipStatus.APPLICATION_PENDING);
    });
  });

  /* ─── Batching behavior ─── */

  describe('batching', () => {
    it('should process multiple keys in a single batch', async () => {
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

      const cred1 = makeCredential('space-member', 'space-1');
      const cred2 = makeCredential('space-member', 'space-2');

      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', [cred1, cred2]]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined, undefined]
      );

      const loader = createLoader(mocks);
      const [result1, result2] = await Promise.all([
        loader.loader.load(makeKey('agent-1', 'user-1', rs1)),
        loader.loader.load(makeKey('agent-1', 'user-1', rs2)),
      ]);

      expect(result1).toBe(CommunityMembershipStatus.MEMBER);
      expect(result2).toBe(CommunityMembershipStatus.MEMBER);
      // Credentials loaded only once
      expect(mocks.agentService.getAgentCredentialsBatch).toHaveBeenCalledTimes(
        1
      );
    });

    it('should mix cached and uncached results in the same batch', async () => {
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

      const cred = makeCredential('space-member', 'space-2');
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', [cred]]])
      );
      // First key is cached, second is not
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [CommunityMembershipStatus.NOT_MEMBER, undefined]
      );

      const loader = createLoader(mocks);
      const [result1, result2] = await Promise.all([
        loader.loader.load(makeKey('agent-1', 'user-1', rs1)),
        loader.loader.load(makeKey('agent-1', 'user-1', rs2)),
      ]);

      expect(result1).toBe(CommunityMembershipStatus.NOT_MEMBER); // from cache
      expect(result2).toBe(CommunityMembershipStatus.MEMBER); // computed
    });
  });

  /* ─── Cache key function ─── */

  describe('DataLoader cache key', () => {
    it('should differentiate keys by agentID + roleSetID', async () => {
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

      const cred1 = makeCredential('space-member', 'space-1');
      mocks.agentService.getAgentCredentialsBatch.mockResolvedValue(
        new Map([['agent-1', [cred1]]])
      );
      mocks.roleSetCacheService.getMembershipStatusBatchFromCache.mockResolvedValue(
        [undefined, undefined]
      );

      const loader = createLoader(mocks);
      const [result1, result2] = await Promise.all([
        loader.loader.load(makeKey('agent-1', 'user-1', rs1)),
        loader.loader.load(makeKey('agent-1', 'user-1', rs2)),
      ]);

      // Same agent, different roleSets → different results
      expect(result1).toBe(CommunityMembershipStatus.MEMBER);
      expect(result2).toBe(CommunityMembershipStatus.NOT_MEMBER);
    });
  });
});
