import {
  AuthorizationCredential,
  AuthorizationRoleGlobal,
} from '@common/enums';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminAuthorizationService } from './admin.authorization.service';

describe('AdminAuthorizationService', () => {
  let service: AdminAuthorizationService;
  let userLookupService: {
    usersWithCredential: Mock;
    getUserAndAgent: Mock;
    getUserAndCredentials: Mock;
  };
  let organizationLookupService: { getOrganizationAndAgent: Mock };
  let agentService: { grantCredentialOrFail: Mock; revokeCredential: Mock };
  let authorizationPolicyService: {
    getAuthorizationPolicyOrFail: Mock;
    reset: Mock;
    createCredentialRuleUsingTypesOnly: Mock;
    appendCredentialAuthorizationRules: Mock;
    save: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminAuthorizationService);
    userLookupService = module.get(
      UserLookupService
    ) as unknown as typeof userLookupService;
    organizationLookupService = module.get(
      OrganizationLookupService
    ) as unknown as typeof organizationLookupService;
    agentService = module.get(
      AgentService
    ) as unknown as typeof agentService;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as unknown as typeof authorizationPolicyService;
  });

  describe('isGlobalAuthorizationCredential', () => {
    it('should return true for a valid global credential', () => {
      expect(
        service.isGlobalAuthorizationCredential(
          AuthorizationRoleGlobal.GLOBAL_ADMIN
        )
      ).toBe(true);
    });

    it('should return false for a non-global credential', () => {
      expect(
        service.isGlobalAuthorizationCredential(
          AuthorizationCredential.SPACE_MEMBER
        )
      ).toBe(false);
    });
  });

  describe('isAuthorizationCredential', () => {
    it('should return true for a valid AuthorizationCredential', () => {
      expect(
        service.isAuthorizationCredential(AuthorizationCredential.GLOBAL_ADMIN)
      ).toBe(true);
    });

    it('should return false for an unknown credential type', () => {
      expect(service.isAuthorizationCredential('non-existent-cred')).toBe(
        false
      );
    });
  });

  describe('usersWithCredentials', () => {
    it('should throw ValidationException for invalid credential type', async () => {
      await expect(
        service.usersWithCredentials({
          type: 'invalid-type' as any,
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should call usersWithCredential when type is valid', async () => {
      vi.mocked(userLookupService.usersWithCredential).mockResolvedValue([]);

      await service.usersWithCredentials({
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: 'res-1',
      });

      expect(userLookupService.usersWithCredential).toHaveBeenCalledWith({
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: 'res-1',
      });
    });
  });

  describe('grantCredentialToUser', () => {
    it('should throw ForbiddenException when global credential has resourceID', async () => {
      await expect(
        service.grantCredentialToUser({
          userID: 'user-1',
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: 'some-resource',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should grant credential and return user on success', async () => {
      const user = { id: 'user-1' };
      const agent = { id: 'agent-1' };
      const updatedAgent = { id: 'agent-1', credentials: [] };

      vi.mocked(userLookupService.getUserAndAgent).mockResolvedValue({
        user,
        agent,
      });
      vi.mocked(agentService.grantCredentialOrFail).mockResolvedValue(
        updatedAgent
      );

      const result = await service.grantCredentialToUser({
        userID: 'user-1',
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'space-1',
      });

      expect(agentService.grantCredentialOrFail).toHaveBeenCalledWith({
        agentID: 'agent-1',
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'space-1',
      });
      expect(result).toBe(user);
      expect(result.agent).toBe(updatedAgent);
    });

    it('should allow global credential without resourceID', async () => {
      const user = { id: 'user-1' } as any;
      const agent = { id: 'agent-1' };
      vi.mocked(userLookupService.getUserAndAgent).mockResolvedValue({
        user,
        agent,
      });
      vi.mocked(agentService.grantCredentialOrFail).mockResolvedValue(agent);

      await service.grantCredentialToUser({
        userID: 'user-1',
        type: AuthorizationCredential.GLOBAL_ADMIN,
      });

      expect(agentService.grantCredentialOrFail).toHaveBeenCalled();
    });
  });

  describe('revokeCredentialFromUser', () => {
    it('should throw ForbiddenException when global credential has resourceID', async () => {
      await expect(
        service.revokeCredentialFromUser({
          userID: 'user-1',
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: 'some-resource',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should revoke credential and return user on success', async () => {
      const user = { id: 'user-1' } as any;
      const agent = { id: 'agent-1' };
      const updatedAgent = { id: 'agent-1', credentials: [] };

      vi.mocked(userLookupService.getUserAndAgent).mockResolvedValue({
        user,
        agent,
      });
      vi.mocked(agentService.revokeCredential).mockResolvedValue(
        updatedAgent
      );

      const result = await service.revokeCredentialFromUser({
        userID: 'user-1',
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'space-1',
      });

      expect(agentService.revokeCredential).toHaveBeenCalledWith({
        agentID: 'agent-1',
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'space-1',
      });
      expect(result).toBe(user);
    });
  });

  describe('grantCredentialToOrganization', () => {
    it('should throw ForbiddenException when global credential has resourceID', async () => {
      await expect(
        service.grantCredentialToOrganization({
          organizationID: 'org-1',
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: 'some-resource',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should grant credential and return organization on success', async () => {
      const organization = { id: 'org-1' } as any;
      const agent = { id: 'agent-1' };
      const updatedAgent = { id: 'agent-1', credentials: [] };

      vi.mocked(
        organizationLookupService.getOrganizationAndAgent
      ).mockResolvedValue({ organization, agent });
      vi.mocked(agentService.grantCredentialOrFail).mockResolvedValue(
        updatedAgent
      );

      const result = await service.grantCredentialToOrganization({
        organizationID: 'org-1',
        type: AuthorizationCredential.ORGANIZATION_ADMIN,
        resourceID: 'org-1',
      });

      expect(result).toBe(organization);
      expect(result.agent).toBe(updatedAgent);
    });
  });

  describe('revokeCredentialFromOrganization', () => {
    it('should throw ForbiddenException when global credential has resourceID', async () => {
      await expect(
        service.revokeCredentialFromOrganization({
          organizationID: 'org-1',
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: 'some-resource',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should revoke credential and return organization on success', async () => {
      const organization = { id: 'org-1' } as any;
      const agent = { id: 'agent-1' };
      const updatedAgent = { id: 'agent-1', credentials: [] };

      vi.mocked(
        organizationLookupService.getOrganizationAndAgent
      ).mockResolvedValue({ organization, agent });
      vi.mocked(agentService.revokeCredential).mockResolvedValue(
        updatedAgent
      );

      const result = await service.revokeCredentialFromOrganization({
        organizationID: 'org-1',
        type: AuthorizationCredential.ORGANIZATION_ADMIN,
        resourceID: 'org-1',
      });

      expect(result).toBe(organization);
      expect(result.agent).toBe(updatedAgent);
    });
  });
});
