import { AuthorizationCredential } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { Account } from '@domain/space/account/account.entity';
import { Space } from '@domain/space/space/space.entity';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { vi } from 'vitest';
import { BootstrapService } from './bootstrap.service';

describe('BootstrapService', () => {
  let service: BootstrapService;
  let module: TestingModule;

  // We store our own mock implementations to avoid spyOn issues with createMock
  const mocks: Record<string, any> = {};

  beforeEach(async () => {
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
      mocks.userLookupService.isRegisteredUser.mockResolvedValue(false);

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

    it('wraps errors in BootstrapException', async () => {
      mocks.userLookupService.isRegisteredUser.mockRejectedValue(
        new Error('DB error')
      );

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
