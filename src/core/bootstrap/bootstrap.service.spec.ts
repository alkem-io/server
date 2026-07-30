import { AuthorizationCredential, LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { VirtualAssistantService } from '@domain/community/virtual-assistant/virtual.assistant.service';
import { Account } from '@domain/space/account/account.entity';
import { Space } from '@domain/space/space/space.entity';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformRoleAssignmentRulesService } from '@platform/platform-role/platform.role.assignment.rules.service';
import { McpApiKeyService } from '@services/mcp-server/auth/mcp-api-key.service';
import { PlatformRoleAssignmentAuditService } from '@src/platform-admin/platform-role-assignment-audit/platform.role.assignment.audit.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { vi } from 'vitest';
import { BootstrapService } from './bootstrap.service';
import * as seededUsers from './platform-template-definitions/user/users.json';

describe('BootstrapService', () => {
  let service: BootstrapService;
  let module: TestingModule;

  // We store our own mock implementations to avoid spyOn issues with createMock
  const mocks: Record<string, any> = {};

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Define mock implementations for key services
    mocks.configService = { get: vi.fn().mockReturnValue(false) };
    mocks.actorContextService = {
      createAnonymous: vi.fn().mockReturnValue(
        Object.assign(new ActorContext(), {
          isAnonymous: true,
          credentials: [
            { type: AuthorizationCredential.GLOBAL_ANONYMOUS, resourceID: '' },
          ],
        })
      ),
    };
    mocks.platformService = {
      ensureForumCreated: vi.fn().mockResolvedValue(undefined),
      ensureMessagingCreated: vi.fn().mockResolvedValue({ id: 'msg-1' }),
      getPlatformOrFail: vi.fn().mockResolvedValue({
        authorization: { credentialRules: 'rules' },
      }),
    };
    mocks.platformTemplatesService = {
      getPlatformTemplatesSet: vi.fn().mockResolvedValue({ id: 'ts-1' }),
      getPlatformTemplateDefault: vi
        .fn()
        .mockResolvedValue({ template: { id: 'tmpl-1' } }),
    };
    mocks.authorizationPolicyService = {
      validateAuthorization: vi
        .fn()
        .mockReturnValue({ credentialRules: 'rules' }),
      getCredentialRules: vi.fn().mockReturnValue([{ name: 'rule' }]),
      saveAll: vi.fn().mockResolvedValue(undefined),
    };
    mocks.organizationLookupService = {
      getOrganizationByNameId: vi.fn().mockResolvedValue({ id: 'org-1' }),
      getOrganizationByNameIdOrFail: vi.fn().mockResolvedValue({ id: 'org-1' }),
    };
    mocks.organizationService = {
      createOrganization: vi.fn().mockResolvedValue({ id: 'org-new' }),
      getRoleSet: vi.fn().mockResolvedValue({ id: 'roleset-1' }),
      getAccount: vi.fn().mockResolvedValue({ id: 'account-1' }),
    };
    mocks.organizationAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };
    mocks.platformWellKnownVCService = {
      getVirtualContributorID: vi.fn().mockResolvedValue('vc-1'),
      setMapping: vi.fn().mockResolvedValue(undefined),
    };
    mocks.userService = {
      createUser: vi.fn().mockResolvedValue({ id: 'user-new' }),
      getUserByEmail: vi.fn().mockResolvedValue({
        id: 'admin-1',
        credentials: [{ type: 'global-admin', resourceID: '' }],
        authenticationID: 'kratos-1',
      }),
      getAccount: vi.fn().mockResolvedValue({ id: 'acc-1' }),
      // corr-server-4 fix: `createUserProfiles` now reconciles the seeded
      // `serviceProfile` marker for a pre-existing user too (not only at
      // creation time), which calls `save`.
      save: vi.fn().mockImplementation((user: any) => Promise.resolve(user)),
    };
    mocks.userLookupService = {
      isRegisteredUser: vi.fn().mockResolvedValue(true),
    };
    mocks.userAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
      grantCredentialsAllUsersReceive: vi.fn().mockResolvedValue(undefined),
    };
    mocks.accountAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };
    mocks.accountLicenseService = {
      applyLicensePolicy: vi.fn().mockResolvedValue([]),
    };
    mocks.licenseService = {
      saveAll: vi.fn().mockResolvedValue(undefined),
    };
    mocks.licensingFrameworkService = {
      getDefaultLicensingOrFail: vi.fn().mockResolvedValue({ id: 'lic-1' }),
      createLicensePlan: vi.fn().mockResolvedValue(undefined),
    };
    mocks.licensePlanService = {
      licensePlanByNameExists: vi.fn().mockResolvedValue(true),
    };
    mocks.roleSetService = {
      assignActorToRole: vi.fn().mockResolvedValue(undefined),
    };
    mocks.adminAuthorizationService = {
      grantCredentialToUser: vi.fn().mockResolvedValue(undefined),
    };
    mocks.aiServerService = {
      getAiServerOrFail: vi.fn().mockResolvedValue({
        authorization: { credentialRules: 'ai-rules' },
      }),
    };
    mocks.aiServerAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };
    mocks.platformAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };
    mocks.accountService = {
      createSpaceOnAccount: vi.fn().mockResolvedValue({ id: 'space-1' }),
      createVirtualContributorOnAccount: vi
        .fn()
        .mockResolvedValue({ id: 'vc-new' }),
    };
    mocks.spaceService = {
      getSpaceOrFail: vi.fn().mockResolvedValue({ id: 'space-1' }),
    };
    mocks.spaceAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };
    mocks.messagingService = {};
    mocks.templatesSetService = {
      createTemplate: vi.fn().mockResolvedValue({ id: 'tmpl-new' }),
    };
    mocks.templateDefaultService = {
      save: vi.fn().mockResolvedValue(undefined),
    };

    // Build injectors map using class tokens
    const { ActorContextService } = await import(
      '@core/actor-context/actor.context.service'
    );
    const { PlatformService } = await import(
      '@platform/platform/platform.service'
    );
    const { PlatformAuthorizationService } = await import(
      '@platform/platform/platform.service.authorization'
    );
    const { AuthorizationPolicyService } = await import(
      '@domain/common/authorization-policy/authorization.policy.service'
    );
    const { PlatformTemplatesService } = await import(
      '@platform/platform-templates/platform.templates.service'
    );
    const { TemplatesSetService } = await import(
      '@domain/template/templates-set/templates.set.service'
    );
    const { TemplateDefaultService } = await import(
      '@domain/template/template-default/template.default.service'
    );
    const { UserLookupService } = await import(
      '@domain/community/user-lookup/user.lookup.service'
    );
    const { UserService } = await import('@domain/community/user/user.service');
    const { UserAuthorizationService } = await import(
      '@domain/community/user/user.service.authorization'
    );
    const { AccountAuthorizationService } = await import(
      '@domain/space/account/account.service.authorization'
    );
    const { OrganizationLookupService } = await import(
      '@domain/community/organization-lookup/organization.lookup.service'
    );
    const { OrganizationService } = await import(
      '@domain/community/organization/organization.service'
    );
    const { OrganizationAuthorizationService } = await import(
      '@domain/community/organization/organization.service.authorization'
    );
    const { AccountLicenseService } = await import(
      '@domain/space/account/account.service.license'
    );
    const { LicenseService } = await import(
      '@domain/common/license/license.service'
    );
    const { LicensingFrameworkService } = await import(
      '@platform/licensing/credential-based/licensing-framework/licensing.framework.service'
    );
    const { LicensePlanService } = await import(
      '@platform/licensing/credential-based/license-plan/license.plan.service'
    );
    const { RoleSetService } = await import(
      '@domain/access/role-set/role.set.service'
    );
    const { AdminAuthorizationService } = await import(
      '@src/platform-admin/domain/authorization/admin.authorization.service'
    );
    const { AiServerService } = await import(
      '@services/ai-server/ai-server/ai.server.service'
    );
    const { AiServerAuthorizationService } = await import(
      '@services/ai-server/ai-server/ai.server.service.authorization'
    );
    const { AccountService } = await import(
      '@domain/space/account/account.service'
    );
    const { SpaceService } = await import('@domain/space/space/space.service');
    const { SpaceAuthorizationService } = await import(
      '@domain/space/space/space.service.authorization'
    );
    const { MessagingService } = await import(
      '@domain/communication/messaging/messaging.service'
    );
    const { PlatformWellKnownVirtualContributorsService } = await import(
      '@platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.service'
    );

    module = await Test.createTestingModule({
      providers: [
        BootstrapService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Account),
        repositoryProviderMockFactory(Space),
        { provide: ConfigService, useValue: mocks.configService },
        { provide: ActorContextService, useValue: mocks.actorContextService },
        { provide: PlatformService, useValue: mocks.platformService },
        {
          provide: PlatformAuthorizationService,
          useValue: mocks.platformAuthorizationService,
        },
        {
          provide: AuthorizationPolicyService,
          useValue: mocks.authorizationPolicyService,
        },
        {
          provide: PlatformTemplatesService,
          useValue: mocks.platformTemplatesService,
        },
        {
          provide: TemplatesSetService,
          useValue: mocks.templatesSetService,
        },
        {
          provide: TemplateDefaultService,
          useValue: mocks.templateDefaultService,
        },
        { provide: UserLookupService, useValue: mocks.userLookupService },
        { provide: UserService, useValue: mocks.userService },
        {
          provide: UserAuthorizationService,
          useValue: mocks.userAuthorizationService,
        },
        {
          provide: AccountAuthorizationService,
          useValue: mocks.accountAuthorizationService,
        },
        {
          provide: OrganizationLookupService,
          useValue: mocks.organizationLookupService,
        },
        {
          provide: OrganizationService,
          useValue: mocks.organizationService,
        },
        {
          provide: OrganizationAuthorizationService,
          useValue: mocks.organizationAuthorizationService,
        },
        {
          provide: AccountLicenseService,
          useValue: mocks.accountLicenseService,
        },
        { provide: LicenseService, useValue: mocks.licenseService },
        {
          provide: LicensingFrameworkService,
          useValue: mocks.licensingFrameworkService,
        },
        {
          provide: LicensePlanService,
          useValue: mocks.licensePlanService,
        },
        { provide: RoleSetService, useValue: mocks.roleSetService },
        {
          provide: AdminAuthorizationService,
          useValue: mocks.adminAuthorizationService,
        },
        { provide: AiServerService, useValue: mocks.aiServerService },
        {
          provide: AiServerAuthorizationService,
          useValue: mocks.aiServerAuthorizationService,
        },
        { provide: AccountService, useValue: mocks.accountService },
        { provide: SpaceService, useValue: mocks.spaceService },
        {
          provide: SpaceAuthorizationService,
          useValue: mocks.spaceAuthorizationService,
        },
        { provide: MessagingService, useValue: mocks.messagingService },
        {
          provide: PlatformWellKnownVirtualContributorsService,
          useValue: mocks.platformWellKnownVCService,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(BootstrapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureAssistantMcpApiKey (#1937)', () => {
    const ENV_KEY = 'ASSISTANT_MCP_API_KEY';
    let saved: string | undefined;
    let keyMock: any;
    let vaMock: any;

    beforeEach(() => {
      saved = process.env[ENV_KEY];
      keyMock = module.get(McpApiKeyService);
      vaMock = module.get(VirtualAssistantService);
      keyMock.ensureActorKeyFromPlaintext = vi.fn().mockResolvedValue({});
      vaMock.getSingletonOrFail = vi
        .fn()
        .mockResolvedValue({ id: 'va-default' });
    });
    afterEach(() => {
      if (saved === undefined) delete process.env[ENV_KEY];
      else process.env[ENV_KEY] = saved;
    });

    const ensure = () => (service as any).ensureAssistantMcpApiKey();

    it('skips before resolving the actor when ASSISTANT_MCP_API_KEY is unset (FR-006)', async () => {
      delete process.env[ENV_KEY];

      await ensure();

      expect(vaMock.getSingletonOrFail).not.toHaveBeenCalled();
      expect(keyMock.ensureActorKeyFromPlaintext).not.toHaveBeenCalled();
    });

    it("skips before resolving the actor when the key lacks the 'mcp_' prefix (it could never authenticate)", async () => {
      process.env[ENV_KEY] = 'not-a-valid-mcp-key';

      await ensure();

      expect(vaMock.getSingletonOrFail).not.toHaveBeenCalled();
      expect(keyMock.ensureActorKeyFromPlaintext).not.toHaveBeenCalled();
    });

    it('skips on the expected not-found (actor absent) without writing a key (FR-006)', async () => {
      process.env[ENV_KEY] = 'mcp_test';
      vaMock.getSingletonOrFail = vi
        .fn()
        .mockRejectedValue(
          new EntityNotFoundException('absent', LogContext.COMMUNITY)
        );

      await ensure();

      expect(keyMock.ensureActorKeyFromPlaintext).not.toHaveBeenCalled();
    });

    it('rethrows an unexpected (transient/DB) error instead of masking it as "actor absent"', async () => {
      process.env[ENV_KEY] = 'mcp_test';
      vaMock.getSingletonOrFail = vi
        .fn()
        .mockRejectedValue(new Error('db connection lost'));

      await expect(ensure()).rejects.toThrow('db connection lost');
      expect(keyMock.ensureActorKeyFromPlaintext).not.toHaveBeenCalled();
    });

    it('ensures the [read,tools] actor-bound key when secret + actor present (FR-001/FR-002)', async () => {
      process.env[ENV_KEY] = 'mcp_test';
      vaMock.getSingletonOrFail = vi.fn().mockResolvedValue({ id: 'va-1' });

      await ensure();

      expect(keyMock.ensureActorKeyFromPlaintext).toHaveBeenCalledWith(
        'va-1',
        'mcp_test',
        [{ operations: ['read', 'tools'] }]
      );
    });
  });

  describe('bootstrap', () => {
    it('runs the full bootstrap without error when everything is pre-existing', async () => {
      // Space repository count returns > 0 so ensureSpaceSingleton skips
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const spaceRepo = module.get(getRepositoryToken(Space));
      (spaceRepo.count as any).mockResolvedValue(1);

      await expect(service.bootstrap()).resolves.not.toThrow();
    });

    it('wraps errors in BootstrapException', async () => {
      mocks.platformService.ensureForumCreated.mockRejectedValue(
        new Error('DB connection failed')
      );

      await expect(service.bootstrap()).rejects.toThrow('DB connection failed');
    });

    it('enables profiling when config says so', async () => {
      mocks.configService.get.mockReturnValue(true);
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const spaceRepo = module.get(getRepositoryToken(Space));
      (spaceRepo.count as any).mockResolvedValue(1);

      await expect(service.bootstrap()).resolves.not.toThrow();
    });

    it('creates templates when template defaults have no template set', async () => {
      mocks.platformTemplatesService.getPlatformTemplateDefault.mockResolvedValue(
        { template: null }
      );

      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const spaceRepo = module.get(getRepositoryToken(Space));
      (spaceRepo.count as any).mockResolvedValue(1);

      await expect(service.bootstrap()).resolves.not.toThrow();
      expect(mocks.templatesSetService.createTemplate).toHaveBeenCalled();
      expect(mocks.templateDefaultService.save).toHaveBeenCalled();
    });

    it('resets platform auth when credential rules are empty', async () => {
      mocks.authorizationPolicyService.getCredentialRules.mockReturnValue([]);

      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const spaceRepo = module.get(getRepositoryToken(Space));
      (spaceRepo.count as any).mockResolvedValue(1);

      await expect(service.bootstrap()).resolves.not.toThrow();
      expect(
        mocks.platformAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
    });

    it('creates space when no spaces exist', async () => {
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const spaceRepo = module.get(getRepositoryToken(Space));
      (spaceRepo.count as any).mockResolvedValue(0);

      await expect(service.bootstrap()).resolves.not.toThrow();
      expect(mocks.accountService.createSpaceOnAccount).toHaveBeenCalled();
    });

    it('creates organization when none exists', async () => {
      mocks.organizationLookupService.getOrganizationByNameId.mockResolvedValue(
        null
      );

      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const spaceRepo = module.get(getRepositoryToken(Space));
      (spaceRepo.count as any).mockResolvedValue(1);

      await expect(service.bootstrap()).resolves.not.toThrow();
      expect(mocks.organizationService.createOrganization).toHaveBeenCalled();
    });

    it('creates guidance VC when not found', async () => {
      mocks.platformWellKnownVCService.getVirtualContributorID.mockResolvedValue(
        null
      );

      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const spaceRepo = module.get(getRepositoryToken(Space));
      (spaceRepo.count as any).mockResolvedValue(1);

      await expect(service.bootstrap()).resolves.not.toThrow();
      expect(
        mocks.accountService.createVirtualContributorOnAccount
      ).toHaveBeenCalled();
      expect(mocks.platformWellKnownVCService.setMapping).toHaveBeenCalled();
    });
  });

  describe('bootstrapUserProfiles', () => {
    it('runs without error when users exist', async () => {
      mocks.userLookupService.isRegisteredUser.mockResolvedValue(true);
      await expect(service.bootstrapUserProfiles()).resolves.not.toThrow();
    });
  });

  // 027-platform-role-redesign (sec-server-15 fix): a freshly-bootstrapped
  // environment must NOT come up with zero `global-admin` holders — every
  // `[GLOBAL_ADMIN]`-pinned policy this feature's round-1/round-2 fixes
  // hardcoded (legacyGlobalAdminPolicy, the T034a FR-022 pin, the legacy
  // space-nameID-rename pin) would otherwise be unreachable by anyone on a
  // rebuilt cluster, with recovery requiring direct DB access.
  describe('users.json seed data (sec-server-15 fix)', () => {
    it('seeds admin@alkem.io with BOTH platform-roles-admin and global-admin', () => {
      const admin = (seededUsers as any).default
        ? (seededUsers as any).default.users.find(
            (u: any) => u.email === 'admin@alkem.io'
          )
        : (seededUsers as any).users.find(
            (u: any) => u.email === 'admin@alkem.io'
          );
      expect(admin).toBeDefined();
      const credentialTypes = admin.credentials.map((c: any) => c.type);
      expect(credentialTypes).toContain('platform-roles-admin');
      expect(credentialTypes).toContain('global-admin');
    });
  });

  describe('createUserProfiles', () => {
    it('skips existing users', async () => {
      mocks.userLookupService.isRegisteredUser.mockResolvedValue(true);

      await service.createUserProfiles([
        {
          email: 'admin@alkem.io',
          firstName: 'Admin',
          lastName: 'User',
          credentials: [],
        },
      ]);

      expect(mocks.userService.createUser).not.toHaveBeenCalled();
    });

    it('creates new users with credentials and authorization', async () => {
      // 027-platform-role-redesign (T053): existence + credentials are
      // resolved via `userService.getUserByEmail` in ONE call — not found
      // on the first lookup, then RELOADED (with credentials) after
      // creation for the seeded-credential grant loop.
      mocks.userService.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-new',
          email: 'new@alkem.io',
          credentials: [],
        });

      await service.createUserProfiles([
        {
          email: 'new@alkem.io',
          firstName: 'New',
          lastName: 'User',
          credentials: [{ type: 'global-admin', resourceID: '' }],
        },
      ]);

      expect(mocks.userService.createUser).toHaveBeenCalledOnce();
      expect(
        mocks.adminAuthorizationService.grantCredentialToUser
      ).toHaveBeenCalledOnce();
      expect(
        mocks.userAuthorizationService.grantCredentialsAllUsersReceive
      ).toHaveBeenCalledOnce();
    });

    it('grants only MISSING credentials on an existing account (T053, idempotent across restarts)', async () => {
      mocks.userService.getUserByEmail.mockResolvedValueOnce({
        id: 'admin-1',
        email: 'admin@alkem.io',
        credentials: [{ type: 'platform-roles-admin', resourceID: '' }],
      });

      await service.createUserProfiles([
        {
          email: 'admin@alkem.io',
          firstName: 'admin',
          lastName: 'alkemio',
          credentials: [
            { type: 'platform-roles-admin', resourceID: '' },
            { type: 'global-admin', resourceID: '' },
          ],
        },
      ]);

      expect(mocks.userService.createUser).not.toHaveBeenCalled();
      // Only the MISSING `global-admin` credential is granted.
      expect(
        mocks.adminAuthorizationService.grantCredentialToUser
      ).toHaveBeenCalledOnce();
      expect(
        mocks.adminAuthorizationService.grantCredentialToUser
      ).toHaveBeenCalledWith(expect.objectContaining({ type: 'global-admin' }));
    });

    it('wraps errors in BootstrapException', async () => {
      mocks.userService.getUserByEmail.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createUserProfiles([
          {
            email: 'bad@test.com',
            firstName: 'A',
            lastName: 'B',
            credentials: [],
          },
        ])
      ).rejects.toThrow('Unable to create profiles');
    });

    // 027-platform-role-redesign (T054/T070j, FR-013/FR-028, FR-024 stateful
    // flow 3): a seeded grant that violates the SAME rule engine the
    // mutation path uses is FATAL — never forced through, never skipped.
    it('T070j flow 3a: a conflicting configured grant raises a FATAL BootstrapException naming the rule', async () => {
      mocks.userService.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-broken-seed',
          email: 'broken-seed@alkem.io',
          credentials: [],
        });
      const rulesService = module.get(PlatformRoleAssignmentRulesService);
      (rulesService.evaluateSeedOrFail as any).mockImplementation(() => {
        throw new Error(
          'Rejected: platform-spaces-reader may only be granted to a service account'
        );
      });

      await expect(
        service.createUserProfiles([
          {
            email: 'broken-seed@alkem.io',
            firstName: 'Broken',
            lastName: 'Seed',
            credentials: [{ type: 'platform-spaces-reader', resourceID: '' }],
          },
        ])
      ).rejects.toThrow('Seeded credential grant rejected');
      // Never forced through by stripping the role.
      expect(
        mocks.adminAuthorizationService.grantCredentialToUser
      ).not.toHaveBeenCalled();
    });

    // FR-024 stateful flow 4: the seeded audit write is marked `seeded:
    // true` so the SHARED writer's own fail-open branch applies (unit-proven
    // in platform.role.assignment.audit.service.spec.ts) — the grant is
    // applied BEFORE the write, so a failing audit store can never roll it
    // back regardless of the writer's internal behaviour.
    it('T070j flow 4: the grant is applied and the audit write is marked seeded (fail-open branch)', async () => {
      mocks.userService.getUserByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'admin-new',
          email: 'admin@alkem.io',
          credentials: [],
        });
      const rulesService = module.get(PlatformRoleAssignmentRulesService);
      (rulesService.evaluateSeedOrFail as any).mockReturnValue(undefined);
      const auditService = module.get(PlatformRoleAssignmentAuditService);
      (auditService.recordGrantOrRevoke as any).mockResolvedValue(undefined);

      await expect(
        service.createUserProfiles([
          {
            email: 'admin@alkem.io',
            firstName: 'admin',
            lastName: 'alkemio',
            credentials: [{ type: 'platform-roles-admin', resourceID: '' }],
          },
        ])
      ).resolves.not.toThrow();
      expect(
        mocks.adminAuthorizationService.grantCredentialToUser
      ).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'platform-roles-admin' })
      );
      expect(auditService.recordGrantOrRevoke).toHaveBeenCalledWith(
        expect.objectContaining({ seeded: true })
      );
    });
  });

  describe('bootstrapLicensePlans', () => {
    it('runs without error', async () => {
      await expect(service.bootstrapLicensePlans()).resolves.not.toThrow();
    });
  });

  describe('createLicensePlans', () => {
    it('skips existing license plans', async () => {
      mocks.licensePlanService.licensePlanByNameExists.mockResolvedValue(true);

      await service.createLicensePlans([{ name: 'Plan A' }]);

      expect(
        mocks.licensingFrameworkService.createLicensePlan
      ).not.toHaveBeenCalled();
    });

    it('creates new license plans', async () => {
      mocks.licensePlanService.licensePlanByNameExists.mockResolvedValue(false);

      await service.createLicensePlans([{ name: 'Plan B' }]);

      expect(
        mocks.licensingFrameworkService.createLicensePlan
      ).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Plan B', licensingID: 'lic-1' })
      );
    });

    it('wraps errors in BootstrapException', async () => {
      mocks.licensingFrameworkService.getDefaultLicensingOrFail.mockRejectedValue(
        new Error('not found')
      );

      await expect(
        service.createLicensePlans([{ name: 'Plan C' }])
      ).rejects.toThrow('Unable to create license plans');
    });
  });
});
