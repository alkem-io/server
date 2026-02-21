import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationRoleGlobal,
} from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { AuthorizationPolicy } from './authorization.policy.entity';
import { IAuthorizationPolicy } from './authorization.policy.interface';
import { AuthorizationPolicyService } from './authorization.policy.service';

const ConfigServiceMock = {
  get: vi.fn().mockReturnValue(500),
};

describe('AuthorizationPolicyService', () => {
  let service: AuthorizationPolicyService;
  let authorizationPolicyRepository: MockType<Repository<AuthorizationPolicy>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationPolicyService,
        repositoryProviderMockFactory(AuthorizationPolicy),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return ConfigServiceMock;
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(AuthorizationPolicyService);
    authorizationPolicyRepository = module.get(
      getRepositoryToken(AuthorizationPolicy)
    );
  });

  describe('createCredentialRule', () => {
    it('should create a credential rule with cascade enabled', () => {
      const result = service.createCredentialRule(
        [AuthorizationPrivilege.READ],
        [{ type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' }],
        'test-rule'
      );

      expect(result.grantedPrivileges).toEqual([AuthorizationPrivilege.READ]);
      expect(result.criterias).toHaveLength(1);
      expect(result.cascade).toBe(true);
      expect(result.name).toBe('test-rule');
    });
  });

  describe('createCredentialRuleUsingTypesOnly', () => {
    it('should create credential definitions from credential types with empty resourceID', () => {
      const result = service.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ, AuthorizationPrivilege.UPDATE],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        'types-rule'
      );

      expect(result.criterias).toHaveLength(2);
      expect(result.criterias[0].type).toBe(
        AuthorizationCredential.GLOBAL_ADMIN
      );
      expect(result.criterias[0].resourceID).toBe('');
      expect(result.criterias[1].type).toBe(
        AuthorizationCredential.GLOBAL_SUPPORT
      );
    });
  });

  describe('createGlobalRolesAuthorizationPolicy', () => {
    it('should create an in-memory authorization policy with global role rules', () => {
      const result = service.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.READ],
        'admin-rule'
      );

      expect(result.type).toBe(AuthorizationPolicyType.IN_MEMORY);
      expect(result.credentialRules.length).toBeGreaterThan(0);
    });

    it('should throw ForbiddenException for invalid global role', () => {
      expect(() =>
        service.createGlobalRolesAuthorizationPolicy(
          ['invalid-role' as AuthorizationRoleGlobal],
          [AuthorizationPrivilege.READ],
          'bad-rule'
        )
      ).toThrow(ForbiddenException);
    });
  });

  describe('reset', () => {
    it('should clear credential and privilege rules on authorization policy', () => {
      const auth = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);
      auth.credentialRules = [{ name: 'old' } as any];
      auth.privilegeRules = [{ name: 'old' } as any];

      const result = service.reset(auth);

      expect(result.credentialRules).toEqual([]);
      expect(result.privilegeRules).toEqual([]);
    });

    it('should throw RelationshipNotFoundException when policy is undefined', () => {
      expect(() => service.reset(undefined)).toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getAuthorizationPolicyOrFail', () => {
    it('should return authorization policy when found', async () => {
      const policy = { id: 'auth-1' } as AuthorizationPolicy;
      authorizationPolicyRepository.findOneBy!.mockResolvedValue(policy);

      const result = await service.getAuthorizationPolicyOrFail('auth-1');

      expect(result).toBe(policy);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      authorizationPolicyRepository.findOneBy!.mockResolvedValue(null);

      await expect(
        service.getAuthorizationPolicyOrFail('missing')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('validateAuthorization', () => {
    it('should return the authorization when defined', () => {
      const auth = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);

      const result = service.validateAuthorization(auth);

      expect(result).toBe(auth);
    });

    it('should throw ForbiddenException when authorization is undefined', () => {
      expect(() => service.validateAuthorization(undefined)).toThrow(
        ForbiddenException
      );
    });
  });

  describe('cloneAuthorizationPolicy', () => {
    it('should create a deep copy of the authorization policy', () => {
      const original = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);
      original.credentialRules = [{ name: 'rule1' } as any];

      const cloned = service.cloneAuthorizationPolicy(original);

      expect(cloned.credentialRules).toEqual(original.credentialRules);
      expect(cloned).not.toBe(original);
      expect(cloned.credentialRules).not.toBe(original.credentialRules);
    });

    it('should throw ForbiddenException when cloning undefined policy', () => {
      expect(() => service.cloneAuthorizationPolicy(undefined)).toThrow(
        ForbiddenException
      );
    });
  });

  describe('appendCredentialAuthorizationRules', () => {
    it('should append additional rules to existing credential rules', () => {
      const auth = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);
      auth.credentialRules = [{ name: 'existing' } as any];

      const result = service.appendCredentialAuthorizationRules(auth, [
        { name: 'new-rule' } as any,
      ]);

      expect(result.credentialRules).toHaveLength(2);
      expect(result.credentialRules[1].name).toBe('new-rule');
    });

    it('should throw ForbiddenException when authorization is undefined', () => {
      expect(() =>
        service.appendCredentialAuthorizationRules(undefined, [])
      ).toThrow(ForbiddenException);
    });
  });

  describe('appendPrivilegeAuthorizationRules', () => {
    it('should append privilege rules to existing rules', () => {
      const auth = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);

      const result = service.appendPrivilegeAuthorizationRules(auth, [
        { name: 'priv-rule' } as any,
      ]);

      expect(result.privilegeRules).toHaveLength(1);
    });
  });

  describe('appendCredentialRuleAnonymousAccess', () => {
    it('should add anonymous access rule with specified privilege', () => {
      const auth = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);

      const result = service.appendCredentialRuleAnonymousAccess(
        auth,
        AuthorizationPrivilege.READ
      );

      expect(result.credentialRules).toHaveLength(1);
      expect(result.credentialRules[0].criterias[0].type).toBe(
        AuthorizationCredential.GLOBAL_ANONYMOUS
      );
    });
  });

  describe('appendCredentialRuleRegisteredAccess', () => {
    it('should add registered access rule with specified privilege', () => {
      const auth = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);

      const result = service.appendCredentialRuleRegisteredAccess(
        auth,
        AuthorizationPrivilege.READ
      );

      expect(result.credentialRules).toHaveLength(1);
      expect(result.credentialRules[0].criterias[0].type).toBe(
        AuthorizationCredential.GLOBAL_REGISTERED
      );
    });
  });

  describe('appendCredentialRuleAnonymousRegisteredAccess', () => {
    it('should add both anonymous and registered credentials in a single rule', () => {
      const auth = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);

      const result = service.appendCredentialRuleAnonymousRegisteredAccess(
        auth,
        AuthorizationPrivilege.READ
      );

      expect(result.credentialRules).toHaveLength(1);
      const criteriaTypes = result.credentialRules[0].criterias.map(
        (c: any) => c.type
      );
      expect(criteriaTypes).toContain(AuthorizationCredential.GLOBAL_ANONYMOUS);
      expect(criteriaTypes).toContain(
        AuthorizationCredential.GLOBAL_REGISTERED
      );
    });
  });

  describe('getCredentialDefinitionsAnonymousRegistered', () => {
    it('should return both anonymous and registered credential definitions', () => {
      const result = service.getCredentialDefinitionsAnonymousRegistered();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(AuthorizationCredential.GLOBAL_ANONYMOUS);
      expect(result[1].type).toBe(AuthorizationCredential.GLOBAL_REGISTERED);
    });
  });

  describe('inheritParentAuthorization', () => {
    it('should only inherit cascading credential rules from in-memory parent (no ID)', async () => {
      const child = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);
      const parent = new AuthorizationPolicy(AuthorizationPolicyType.SPACE);
      // In-memory parent (no id) triggers fallback copy path
      parent.credentialRules = [
        { name: 'cascading', cascade: true } as any,
        { name: 'non-cascading', cascade: false } as any,
      ];

      const result = await service.inheritParentAuthorization(child, parent);

      expect(result.credentialRules).toHaveLength(1);
      expect(result.credentialRules[0].name).toBe('cascading');
    });

    it('should throw ForbiddenException when parent authorization is undefined', async () => {
      const child = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);

      await expect(
        service.inheritParentAuthorization(child, undefined)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create new UNKNOWN policy when child is undefined', async () => {
      const parent = new AuthorizationPolicy(AuthorizationPolicyType.SPACE);
      parent.credentialRules = [];

      const result = await service.inheritParentAuthorization(
        undefined,
        parent
      );

      expect(result).toBeDefined();
      expect(result.credentialRules).toEqual([]);
    });

    it('should assign parent _childInheritedCredentialRuleSet to child via FK when present', async () => {
      const child = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);
      const parent = new AuthorizationPolicy(AuthorizationPolicyType.SPACE);
      parent.credentialRules = [{ name: 'cascading', cascade: true } as any];

      const inheritedRuleSet = {
        id: 'inherited-rs-1',
        credentialRules: [{ name: 'inherited-rule' }],
      } as any;
      parent._childInheritedCredentialRuleSet = inheritedRuleSet;

      const result = await service.inheritParentAuthorization(child, parent);

      // FK path: inherited rule set assigned, credentialRules stays empty (reset)
      expect(result.inheritedCredentialRuleSet).toBe(inheritedRuleSet);
      expect(result.credentialRules).toEqual([]);
    });

    it('should reset child rules before FK assignment', async () => {
      const child = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);
      child.credentialRules = [{ name: 'old-child-rule' } as any];
      child.privilegeRules = [{ name: 'old-priv-rule' } as any];

      const parent = new AuthorizationPolicy(AuthorizationPolicyType.SPACE);
      parent.credentialRules = [];

      const inheritedRuleSet = {
        id: 'inherited-rs-2',
        credentialRules: [{ name: 'inherited-rule' }],
      } as any;
      parent._childInheritedCredentialRuleSet = inheritedRuleSet;

      const result = await service.inheritParentAuthorization(child, parent);

      // Child's pre-existing rules are cleared
      expect(result.credentialRules).toEqual([]);
      expect(result.privilegeRules).toEqual([]);
      expect(result.inheritedCredentialRuleSet).toBe(inheritedRuleSet);
    });

    it('should auto-resolve via resolveForParent when parent is persisted and cache is empty', async () => {
      const child = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);
      const parent = new AuthorizationPolicy(AuthorizationPolicyType.SPACE);
      // Simulate a persisted parent (has an id)
      (parent as any).id = 'parent-policy-id';
      parent.credentialRules = [
        { name: 'cascading', cascade: true } as any,
      ];

      const result = await service.inheritParentAuthorization(child, parent);

      // Auto-resolve should have been called, populating _childInheritedCredentialRuleSet
      expect(result.inheritedCredentialRuleSet).toBe(
        parent._childInheritedCredentialRuleSet
      );
    });

    it('should reuse cached _childInheritedCredentialRuleSet for sibling children', async () => {
      const parent = new AuthorizationPolicy(AuthorizationPolicyType.SPACE);
      parent.credentialRules = [];
      const inheritedRuleSet = {
        id: 'shared-rs',
        credentialRules: [{ name: 'shared-rule' }],
      } as any;
      parent._childInheritedCredentialRuleSet = inheritedRuleSet;

      const child1 = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);
      const child2 = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);

      const result1 = await service.inheritParentAuthorization(child1, parent);
      const result2 = await service.inheritParentAuthorization(child2, parent);

      // Both siblings share the same inherited rule set reference
      expect(result1.inheritedCredentialRuleSet).toBe(inheritedRuleSet);
      expect(result2.inheritedCredentialRuleSet).toBe(inheritedRuleSet);
    });
  });

  describe('saveAll', () => {
    it('should save authorization policies in chunks', async () => {
      const policies = Array.from({ length: 3 }, (_, i) => ({
        id: `auth-${i}`,
        type: AuthorizationPolicyType.PROFILE,
      })) as IAuthorizationPolicy[];

      authorizationPolicyRepository.save!.mockResolvedValue(policies);

      await service.saveAll(policies);

      expect(authorizationPolicyRepository.save).toHaveBeenCalledWith(
        policies,
        { chunk: 500 }
      );
    });
  });

  describe('getAgentPrivileges', () => {
    it('should return empty array when agentInfo is falsy', () => {
      const auth = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);

      const result = service.getAgentPrivileges(null as any, auth);

      expect(result).toEqual([]);
    });

    it('should return empty array when agentInfo has no credentials', () => {
      const auth = new AuthorizationPolicy(AuthorizationPolicyType.PROFILE);

      const result = service.getAgentPrivileges(
        { credentials: undefined } as any,
        auth
      );

      expect(result).toEqual([]);
    });
  });
});
