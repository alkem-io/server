import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationRoleGlobal,
} from '@common/enums';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
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
    getUserByIdOrFail: Mock;
    getUserAndCredentials: Mock;
  };
  let organizationLookupService: { getOrganizationByIdOrFail: Mock };
  let actorService: {
    grantCredentialOrFail: Mock;
    revokeCredential: Mock;
    findActorsWithMatchingCredentials: Mock;
  };
  let authorizationPolicyService: {
    getAuthorizationPolicyOrFail: Mock;
    reset: Mock;
    createCredentialRuleUsingTypesOnly: Mock;
    appendCredentialAuthorizationRules: Mock;
    save: Mock;
  };
  let actorLookupService: { getActorCredentialsOrFail: Mock };
  let authorizationService: { getGrantedPrivileges: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    actorService = module.get(ActorService) as unknown as typeof actorService;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as unknown as typeof authorizationPolicyService;
    actorLookupService = module.get(
      ActorLookupService
    ) as unknown as typeof actorLookupService;
    authorizationService = module.get(
      AuthorizationService
    ) as unknown as typeof authorizationService;
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

      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue(user);
      vi.mocked(actorService.grantCredentialOrFail).mockResolvedValue(
        undefined
      );

      const result = await service.grantCredentialToUser({
        userID: 'user-1',
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'space-1',
      });

      // User IS the Actor - user.id is the actorID
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'user-1',
        {
          type: AuthorizationCredential.SPACE_MEMBER,
          resourceID: 'space-1',
        }
      );
      expect(result).toBe(user);
    });

    it('should allow global credential without resourceID', async () => {
      const user = { id: 'user-1' } as any;
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue(user);
      vi.mocked(actorService.grantCredentialOrFail).mockResolvedValue(
        undefined
      );

      await service.grantCredentialToUser({
        userID: 'user-1',
        type: AuthorizationCredential.GLOBAL_ADMIN,
      });

      expect(actorService.grantCredentialOrFail).toHaveBeenCalled();
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

      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue(user);
      vi.mocked(actorService.revokeCredential).mockResolvedValue(undefined);

      const result = await service.revokeCredentialFromUser({
        userID: 'user-1',
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'space-1',
      });

      // User IS the Actor - user.id is the actorID
      expect(actorService.revokeCredential).toHaveBeenCalledWith('user-1', {
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

      vi.mocked(
        organizationLookupService.getOrganizationByIdOrFail
      ).mockResolvedValue(organization);
      vi.mocked(actorService.grantCredentialOrFail).mockResolvedValue(
        undefined
      );

      const result = await service.grantCredentialToOrganization({
        organizationID: 'org-1',
        type: AuthorizationCredential.ORGANIZATION_ADMIN,
        resourceID: 'org-1',
      });

      expect(result).toBe(organization);
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

      vi.mocked(
        organizationLookupService.getOrganizationByIdOrFail
      ).mockResolvedValue(organization);
      vi.mocked(actorService.revokeCredential).mockResolvedValue(undefined);

      const result = await service.revokeCredentialFromOrganization({
        organizationID: 'org-1',
        type: AuthorizationCredential.ORGANIZATION_ADMIN,
        resourceID: 'org-1',
      });

      expect(result).toBe(organization);
    });
  });

  describe('actorsWithCredential', () => {
    it('should find actors with matching credentials', async () => {
      const actors = [{ id: 'actor-1' }];
      vi.mocked(
        actorService.findActorsWithMatchingCredentials
      ).mockResolvedValue(actors as any);

      const result = await service.actorsWithCredential(
        'some-type' as any,
        'resource-1'
      );

      expect(
        actorService.findActorsWithMatchingCredentials
      ).toHaveBeenCalledWith({
        type: 'some-type',
        resourceID: 'resource-1',
      });
      expect(result).toEqual(actors);
    });

    it('should work without resourceID', async () => {
      vi.mocked(
        actorService.findActorsWithMatchingCredentials
      ).mockResolvedValue([]);

      const result = await service.actorsWithCredential('some-type' as any);

      expect(
        actorService.findActorsWithMatchingCredentials
      ).toHaveBeenCalledWith({
        type: 'some-type',
        resourceID: undefined,
      });
      expect(result).toEqual([]);
    });
  });

  describe('userAuthorizationPrivileges', () => {
    it('should return granted privileges for a user', async () => {
      const credentials = [{ type: 'global-admin' }];
      const authPolicy = { id: 'auth-1' };
      const privileges = [AuthorizationPrivilege.READ];
      const actorContext = { actorID: 'actor-1' } as any as ActorContext;

      vi.mocked(actorLookupService.getActorCredentialsOrFail).mockResolvedValue(
        credentials as any
      );
      vi.mocked(
        authorizationPolicyService.getAuthorizationPolicyOrFail
      ).mockResolvedValue(authPolicy as any);
      vi.mocked(authorizationService.getGrantedPrivileges).mockReturnValue(
        privileges
      );

      const result = await service.userAuthorizationPrivileges(actorContext, {
        userID: 'user-1',
        authorizationID: 'auth-1',
      } as any);

      expect(actorLookupService.getActorCredentialsOrFail).toHaveBeenCalledWith(
        'user-1'
      );
      expect(
        authorizationPolicyService.getAuthorizationPolicyOrFail
      ).toHaveBeenCalledWith('auth-1');
      expect(authorizationService.getGrantedPrivileges).toHaveBeenCalledWith(
        credentials,
        authPolicy
      );
      expect(result).toEqual(privileges);
    });
  });

  describe('resetAuthorizationPolicy', () => {
    it('should reset and extend authorization policy with global admin rules', async () => {
      const authorization = { id: 'auth-1', credentialRules: [] as any[] };
      const savedAuth = { id: 'auth-1-saved' };

      vi.mocked(
        authorizationPolicyService.getAuthorizationPolicyOrFail
      ).mockResolvedValue(authorization as any);
      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue({ cascade: true } as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(authorization as any);
      vi.mocked(authorizationPolicyService.save).mockResolvedValue(
        savedAuth as any
      );

      const result = await service.resetAuthorizationPolicy('auth-1');

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(
        authorization
      );
      expect(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.save).toHaveBeenCalled();
      expect(result).toEqual(savedAuth);
    });
  });

  describe('extendAuthorizationPolicyWithAuthorizationReset', () => {
    it('should add AUTHORIZATION_RESET rule for global admins and support', () => {
      const authorization = { id: 'auth-1', credentialRules: [] } as any;
      const rule = { cascade: true } as any;
      const extendedAuth = { id: 'auth-1-extended' } as any;

      vi.mocked(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).mockReturnValue(rule);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(extendedAuth);

      const result =
        service.extendAuthorizationPolicyWithAuthorizationReset(authorization);

      expect(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).toHaveBeenCalledWith(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        expect.any(String)
      );
      expect(rule.cascade).toBe(false);
      expect(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).toHaveBeenCalledWith(authorization, [rule]);
      expect(result).toEqual(extendedAuth);
    });
  });
});
