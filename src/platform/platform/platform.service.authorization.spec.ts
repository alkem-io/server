import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleSetType } from '@common/enums/role.set.type';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { MessagingAuthorizationService } from '@domain/communication/messaging/messaging.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';
import { LibraryAuthorizationService } from '@library/library/library.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ForumAuthorizationService } from '@platform/forum/forum.service.authorization';
import { LicensingFrameworkAuthorizationService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service.authorization';
import { type Mocked, vi } from 'vitest';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';
import { PlatformAuthorizationService } from './platform.service.authorization';

describe('PlatformAuthorizationService', () => {
  let service: PlatformAuthorizationService;
  let platformService: Mocked<PlatformService>;
  let messagingAuthorizationService: Mocked<MessagingAuthorizationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;

  const mockPlatform: IPlatform = {
    id: 'platform-1',
    authorization: {
      id: 'auth-1',
      credentialRules: [],
      privilegeRules: [],
      verifiedCredentialRules: [],
      type: 'PLATFORM' as any,
      createdDate: new Date(),
      updatedDate: new Date(),
    } as unknown as IAuthorizationPolicy,
    forum: { id: 'forum-1' } as any,
    library: { id: 'library-1' } as any,
    storageAggregator: { id: 'storage-1' } as any,
    licensingFramework: { id: 'licensing-1' } as any,
    templatesManager: { id: 'templates-1' } as any,
    roleSet: { id: 'roleset-1', type: RoleSetType.PLATFORM } as any,
    messaging: { id: 'messaging-1' } as any,
  } as IPlatform;

  beforeEach(async () => {
    const mockAuthorizationPolicyService = {
      reset: vi.fn(auth => auth),
      appendCredentialAuthorizationRules: vi.fn(auth => auth),
      cloneAuthorizationPolicy: vi.fn(auth => ({ ...auth })),
      appendCredentialRuleAnonymousRegisteredAccess: vi.fn(auth => auth),
      createCredentialRuleUsingTypesOnly: vi.fn(() => ({
        cascade: false,
      })),
      createCredentialRule: vi.fn((grantedPrivileges, criterias, name) => ({
        grantedPrivileges,
        criterias,
        name,
        cascade: false,
      })),
    };

    const mockPlatformService = {
      getPlatformOrFail: vi.fn(),
    };

    const mockPlatformAuthorizationPolicyService = {
      inheritRootAuthorizationPolicy: vi.fn(auth => auth),
    };

    const mockForumAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockLibraryAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue({ id: 'lib-auth' }),
    };

    const mockStorageAggregatorAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockTemplatesManagerAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockLicensingFrameworkAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockRoleSetAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockMessagingAuthorizationService = {
      applyAuthorizationPolicy: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAuthorizationService,
        {
          provide: AuthorizationPolicyService,
          useValue: mockAuthorizationPolicyService,
        },
        {
          provide: PlatformService,
          useValue: mockPlatformService,
        },
        {
          provide: PlatformAuthorizationPolicyService,
          useValue: mockPlatformAuthorizationPolicyService,
        },
        {
          provide: ForumAuthorizationService,
          useValue: mockForumAuthorizationService,
        },
        {
          provide: LibraryAuthorizationService,
          useValue: mockLibraryAuthorizationService,
        },
        {
          provide: StorageAggregatorAuthorizationService,
          useValue: mockStorageAggregatorAuthorizationService,
        },
        {
          provide: TemplatesManagerAuthorizationService,
          useValue: mockTemplatesManagerAuthorizationService,
        },
        {
          provide: LicensingFrameworkAuthorizationService,
          useValue: mockLicensingFrameworkAuthorizationService,
        },
        {
          provide: RoleSetAuthorizationService,
          useValue: mockRoleSetAuthorizationService,
        },
        {
          provide: MessagingAuthorizationService,
          useValue: mockMessagingAuthorizationService,
        },
      ],
    }).compile();

    service = module.get<PlatformAuthorizationService>(
      PlatformAuthorizationService
    );
    platformService = module.get(PlatformService);
    messagingAuthorizationService = module.get(MessagingAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw error if messaging is missing', async () => {
      const platformWithoutMessaging = {
        ...mockPlatform,
        messaging: undefined,
      };
      platformService.getPlatformOrFail.mockResolvedValue(
        platformWithoutMessaging
      );

      await expect(service.applyAuthorizationPolicy()).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should cascade authorization to messaging', async () => {
      platformService.getPlatformOrFail.mockResolvedValue(mockPlatform);
      messagingAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        { id: 'messaging-auth' } as IAuthorizationPolicy,
      ]);

      await service.applyAuthorizationPolicy();

      expect(
        messagingAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(
        mockPlatform.messaging,
        mockPlatform.authorization
      );
    });

    it('should include messaging authorizations in result', async () => {
      platformService.getPlatformOrFail.mockResolvedValue(mockPlatform);
      const messagingAuth = {
        id: 'messaging-auth',
      } as IAuthorizationPolicy;
      messagingAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        messagingAuth,
      ]);

      const result = await service.applyAuthorizationPolicy();

      expect(result).toContainEqual(messagingAuth);
    });

    it('should apply authorization to all platform children', async () => {
      platformService.getPlatformOrFail.mockResolvedValue(mockPlatform);
      messagingAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );

      const result = await service.applyAuthorizationPolicy();

      // Should have called authorization for all children including messaging
      expect(
        messagingAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // workspace#032: privilege hardening for the Platform Operations Admin role.
  describe('PLATFORM_OPERATIONS_ADMIN credential hardening', () => {
    const collectPrivilegesGrantedToCredential = () => {
      const granted = new Set<AuthorizationPrivilege>();
      for (const [privileges, credentialTypes] of authorizationPolicyService
        .createCredentialRuleUsingTypesOnly.mock.calls) {
        if (
          (credentialTypes as AuthorizationCredential[]).includes(
            AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN
          )
        ) {
          for (const p of privileges as AuthorizationPrivilege[]) {
            granted.add(p);
          }
        }
      }
      for (const [privileges, criterias] of authorizationPolicyService
        .createCredentialRule.mock.calls) {
        if (
          (criterias as { type: AuthorizationCredential }[]).some(
            c => c.type === AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN
          )
        ) {
          for (const p of privileges as AuthorizationPrivilege[]) {
            granted.add(p);
          }
        }
      }
      return granted;
    };

    beforeEach(() => {
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockImplementation(
        ((privileges: any, types: any, name: any) => ({
          grantedPrivileges: privileges,
          criterias: types,
          name,
          cascade: true,
        })) as any
      );
      platformService.getPlatformOrFail.mockResolvedValue(mockPlatform);
      messagingAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
    });

    it('grants the operational privilege on a dedicated non-cascading rule covering all develop-era admin credentials plus the new role', async () => {
      await service.applyAuthorizationPolicy();

      const opsRules =
        authorizationPolicyService.createCredentialRuleUsingTypesOnly.mock.results
          .map(r => r.value)
          .filter(rule =>
            rule.grantedPrivileges?.includes(
              AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN
            )
          );

      expect(opsRules).toHaveLength(1);
      const rule = opsRules[0];
      // Additivity (FR-009): everyone passing the old PLATFORM_ADMIN gates
      // must pass the new gate — plus the dedicated role credential.
      expect(rule.criterias).toEqual(
        expect.arrayContaining([
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
          AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN,
        ])
      );
      // Operational privilege must not leak down the policy tree.
      expect(rule.cascade).toBe(false);
    });

    it('grants the role credential exactly the operational privilege and AUTHORIZATION_RESET on the platform policy', async () => {
      await service.applyAuthorizationPolicy();

      // AUTHORIZATION_RESET backs authorizationPolicyResetOnPlatform — part
      // of the operational family, not an elevation.
      expect(collectPrivilegesGrantedToCredential()).toEqual(
        new Set([
          AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
          AuthorizationPrivilege.AUTHORIZATION_RESET,
        ])
      );
    });

    it('never grants the role credential the excluded elevated privileges', async () => {
      await service.applyAuthorizationPolicy();

      const granted = collectPrivilegesGrantedToCredential();
      for (const excluded of [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ]) {
        expect(granted).not.toContain(excluded);
      }
    });
  });

  // 004-web-ai-assistant (FR-027): the ACCESS_VIRTUAL_ASSISTANT credential rule.
  describe('ACCESS_VIRTUAL_ASSISTANT credential rule', () => {
    it('grants ACCESS_VIRTUAL_ASSISTANT to GLOBAL_ADMIN OR ASSISTANT_ACCESS, never GLOBAL_REGISTERED', async () => {
      platformService.getPlatformOrFail.mockResolvedValue(mockPlatform);
      messagingAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );

      await service.applyAuthorizationPolicy();

      const assistantRuleCall =
        authorizationPolicyService.createCredentialRule.mock.calls.find(call =>
          (call[0] as AuthorizationPrivilege[]).includes(
            AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT
          )
        );

      expect(assistantRuleCall).toBeDefined();
      const criteriaTypes = (
        assistantRuleCall![1] as { type: AuthorizationCredential }[]
      ).map(c => c.type);

      // Anchored to platform admin + the admin-assignable access credential.
      expect(criteriaTypes).toContain(AuthorizationCredential.GLOBAL_ADMIN);
      expect(criteriaTypes).toContain(AuthorizationCredential.ASSISTANT_ACCESS);
      // Out of the box NOT every registered user.
      expect(criteriaTypes).not.toContain(
        AuthorizationCredential.GLOBAL_REGISTERED
      );
    });
  });

  // 027-platform-role-redesign (T070f): the explicit exact-privilege-array
  // assertions for T034/T034a/T035's grant-set widenings and re-anchors on
  // the platform policy — the direct guard reachability.spec.ts (T070m)
  // covers only indirectly, via set equality against the census.
  describe('027-platform-role-redesign — T034/T034a/T035 grant-set widenings (T070f)', () => {
    const arrange = () => {
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mockImplementation(
        ((privileges: any, types: any, name: any) => ({
          grantedPrivileges: privileges,
          criterias: types,
          name,
          cascade: true,
        })) as any
      );
      platformService.getPlatformOrFail.mockResolvedValue(mockPlatform);
      messagingAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
    };

    const rulesGranting = (privilege: AuthorizationPrivilege) =>
      authorizationPolicyService.createCredentialRuleUsingTypesOnly.mock.results
        .map(r => r.value)
        .filter((rule: any) => rule.grantedPrivileges?.includes(privilege));

    it('GRANT_GLOBAL_ADMINS (T034 widening): EXACTLY {global-admin, platform-roles-admin}, non-cascading — the FR-022 pin (T034a) keeps the widening off the four credential mutations at the resolver, not here', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(AuthorizationPrivilege.GRANT_GLOBAL_ADMINS);
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
      ]);
      expect(rules[0].cascade).toBe(false);
    });

    it('FEATURE_ROLE_ASSIGN (T034, A2): EXACTLY {platform-users-admin, platform-roles-admin} — wholly new privilege, no legacy reacher', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(AuthorizationPrivilege.FEATURE_ROLE_ASSIGN);
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
      ]);
      expect(rules[0].cascade).toBe(false);
    });

    it('PLATFORM_ROLE_HOLDERS_READ (T034, A20): EXACTLY {platform-roles-admin, platform-audit-reader} plus the three legacy broad grants', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(
        AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ
      );
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
        AuthorizationCredential.PLATFORM_AUDIT_READER,
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
      ]);
      expect(rules[0].cascade).toBe(false);
    });

    it('FEATURE_ROLE_HOLDERS_READ (T034, A20b): EXACTLY {platform-users-admin} plus legacy — NOT platform-roles-admin / platform-audit-reader, which reach it by subsumption through PLATFORM_ROLE_HOLDERS_READ (D9)', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(
        AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ
      );
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
      ]);
      expect(rules[0].criterias).not.toContain(
        AuthorizationCredential.PLATFORM_ROLES_ADMIN
      );
      expect(rules[0].criterias).not.toContain(
        AuthorizationCredential.PLATFORM_AUDIT_READER
      );
      expect(rules[0].cascade).toBe(false);
    });

    it('PLATFORM_AUDIT_READ (T035, A19): EXACTLY {platform-audit-reader} plus legacy, read-only, held by no other target role', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(AuthorizationPrivilege.PLATFORM_AUDIT_READ);
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.PLATFORM_AUDIT_READER,
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
      ]);
      expect(rules[0].cascade).toBe(false);
    });

    it('SET_SERVICE_PROFILE (T035, A21): EXACTLY {platform-roles-admin} plus legacy', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(AuthorizationPrivilege.SET_SERVICE_PROFILE);
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
      ]);
      expect(rules[0].cascade).toBe(false);
    });

    it('PLATFORM_USERS_ADMIN (T061/T062, A4/A5, on the platform tree): EXACTLY {platform-users-admin} plus the union of A4 and A5 legacy reachers', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(AuthorizationPrivilege.PLATFORM_USERS_ADMIN);
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
      ]);
      expect(rules[0].cascade).toBe(false);
    });

    it('PLATFORM_FORUM_MANAGE (T035, A15, FR-007(e)): EXACTLY {platform-support} plus legacy, cascading — and, distinguishing a correctly-gated surface from a CRUD-gated one, platform-content-full-access is NOT among the reachers', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(AuthorizationPrivilege.PLATFORM_FORUM_MANAGE);
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.PLATFORM_SUPPORT,
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
      ]);
      expect(rules[0].criterias).not.toContain(
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
      );
      expect(rules[0].cascade).toBe(true);
    });

    it('PLATFORM_SETTINGS_ADMIN (T035, A10): EXACTLY the union of both surfaces it re-anchors — including platform-settings-admin itself', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(
        AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN
      );
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
      ]);
      expect(rules[0].cascade).toBe(false);
    });

    it('CREATE_ORGANIZATION (T035, A6 create half): EXACTLY {global-admin, global-support, beta-tester, platform-support, feature-organization-creator} — deliberately separate from DELETE_ORGANIZATION so Feature Organization Creator can never acquire the delete half', async () => {
      arrange();
      await service.applyAuthorizationPolicy();

      const rules = rulesGranting(AuthorizationPrivilege.CREATE_ORGANIZATION);
      expect(rules).toHaveLength(1);
      expect(rules[0].criterias).toEqual([
        AuthorizationCredential.GLOBAL_ADMIN,
        AuthorizationCredential.GLOBAL_SUPPORT,
        AuthorizationCredential.BETA_TESTER,
        AuthorizationCredential.PLATFORM_SUPPORT,
        AuthorizationCredential.FEATURE_ORGANIZATION_CREATOR,
      ]);
      expect(rules[0].cascade).toBe(false);
    });
  });
});
