import { MessagingQueue } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { OrganizationLicenseService } from '@domain/community/organization/organization.service.license';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AccountService } from '@domain/space/account/account.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { RmqContext } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationService } from '@platform/platform/platform.service.authorization';
import { PlatformLicenseService } from '@platform/platform/platform.service.license';
import { AiServerAuthorizationService } from '@services/ai-server/ai-server/ai.server.service.authorization';
import { TaskService } from '@services/task/task.service';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { RESET_EVENT_TYPE } from '../reset.event.type';
import { AuthResetController } from './auth-reset.controller';

// Helper to create a mock RmqContext
function createMockContext(
  retryCount: number | undefined = 0,
  includeHeaders = true
) {
  const channel = {
    ack: vi.fn(),
    reject: vi.fn(),
    publish: vi.fn(),
  };
  const headers = includeHeaders ? { 'x-retry-count': retryCount } : undefined;
  const message = {
    content: Buffer.from('test'),
    properties: {
      headers,
    },
  };
  const context = {
    getChannelRef: vi.fn().mockReturnValue(channel),
    getMessage: vi.fn().mockReturnValue(message),
    getPattern: vi.fn(),
    getArgs: vi.fn(),
    getArgByIndex: vi.fn(),
  } as unknown as RmqContext;

  return { channel, message, context };
}

describe('AuthResetController', () => {
  let controller: AuthResetController;
  let accountService: Mocked<AccountService>;
  let accountAuthorizationService: Mocked<AccountAuthorizationService>;
  let accountLicenseService: Mocked<AccountLicenseService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let licenseService: Mocked<LicenseService>;
  let platformAuthorizationService: Mocked<PlatformAuthorizationService>;
  let platformLicenseService: Mocked<PlatformLicenseService>;
  let aiServerAuthorizationService: Mocked<AiServerAuthorizationService>;
  let userService: Mocked<UserService>;
  let userAuthorizationService: Mocked<UserAuthorizationService>;
  let organizationService: Mocked<OrganizationService>;
  let organizationLookupService: Mocked<OrganizationLookupService>;
  let organizationAuthorizationService: Mocked<OrganizationAuthorizationService>;
  let organizationLicenseService: Mocked<OrganizationLicenseService>;
  let taskService: Mocked<TaskService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MockWinstonProvider],
      controllers: [AuthResetController],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    controller = module.get<AuthResetController>(AuthResetController);
    accountService = module.get(AccountService) as Mocked<AccountService>;
    accountAuthorizationService = module.get(
      AccountAuthorizationService
    ) as Mocked<AccountAuthorizationService>;
    accountLicenseService = module.get(
      AccountLicenseService
    ) as Mocked<AccountLicenseService>;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    licenseService = module.get(LicenseService) as Mocked<LicenseService>;
    platformAuthorizationService = module.get(
      PlatformAuthorizationService
    ) as Mocked<PlatformAuthorizationService>;
    platformLicenseService = module.get(
      PlatformLicenseService
    ) as Mocked<PlatformLicenseService>;
    aiServerAuthorizationService = module.get(
      AiServerAuthorizationService
    ) as Mocked<AiServerAuthorizationService>;
    userService = module.get(UserService) as Mocked<UserService>;
    userAuthorizationService = module.get(
      UserAuthorizationService
    ) as Mocked<UserAuthorizationService>;
    organizationService = module.get(
      OrganizationService
    ) as Mocked<OrganizationService>;
    organizationLookupService = module.get(
      OrganizationLookupService
    ) as Mocked<OrganizationLookupService>;
    organizationAuthorizationService = module.get(
      OrganizationAuthorizationService
    ) as Mocked<OrganizationAuthorizationService>;
    organizationLicenseService = module.get(
      OrganizationLicenseService
    ) as Mocked<OrganizationLicenseService>;
    taskService = module.get(TaskService) as Mocked<TaskService>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── authResetAccount ────────────────────────────────────────────
  describe('authResetAccount', () => {
    const payload = {
      id: 'acc-1',
      type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT,
      task: 'task-1',
    };

    it('should apply authorization policy, bulk update, and ack on success', async () => {
      const { channel, context } = createMockContext(0);
      const account = { id: 'acc-1' };
      const policies = [{ id: 'policy-1' }];
      accountService.getAccountOrFail.mockResolvedValue(account as any);
      accountAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        policies as any
      );
      authorizationPolicyService.bulkUpdate.mockResolvedValue(undefined as any);

      await controller.authResetAccount(payload, context);

      expect(accountService.getAccountOrFail).toHaveBeenCalledWith('acc-1');
      expect(
        accountAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(account);
      expect(authorizationPolicyService.bulkUpdate).toHaveBeenCalledWith(
        policies
      );
      expect(taskService.updateTaskResults).toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should handle batch payload with multiple IDs', async () => {
      const { channel, context } = createMockContext(0);
      const batchPayload = { ...payload, ids: ['acc-1', 'acc-2'] };
      accountService.getAccountOrFail.mockResolvedValue({ id: 'acc' } as any);
      accountAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'p' }] as any
      );
      authorizationPolicyService.bulkUpdate.mockResolvedValue(undefined as any);

      await controller.authResetAccount(batchPayload, context);

      expect(accountService.getAccountOrFail).toHaveBeenCalledTimes(2);
      expect(authorizationPolicyService.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should retry in-process on failure and continue with remaining entities', async () => {
      const { channel, context } = createMockContext(0);
      // Fail 5 times then succeed on 6th call (exceeds MAX_RETRIES)
      accountService.getAccountOrFail.mockRejectedValue(new Error('not found'));

      await controller.authResetAccount(payload, context);

      // In-process retry exhausted, error logged
      expect(taskService.updateTaskErrors).toHaveBeenCalled();
      // Message is always ACKed (per-entity errors don't NACK)
      expect(channel.ack).toHaveBeenCalled();
    });
  });

  // ── licenseResetAccount ─────────────────────────────────────────
  describe('licenseResetAccount', () => {
    const payload = {
      id: 'acc-2',
      type: RESET_EVENT_TYPE.LICENSE_RESET_ACCOUNT,
      task: 'task-2',
    };

    it('should apply license policy and ack on success', async () => {
      const { channel, context } = createMockContext(0);
      const account = { id: 'acc-2' };
      accountService.getAccountOrFail.mockResolvedValue(account as any);
      accountLicenseService.applyLicensePolicy.mockResolvedValue([]);
      licenseService.saveAll.mockResolvedValue(undefined as any);

      await controller.licenseResetAccount(payload, context);

      expect(accountService.getAccountOrFail).toHaveBeenCalledWith('acc-2');
      expect(accountLicenseService.applyLicensePolicy).toHaveBeenCalledWith(
        'acc-2'
      );
      expect(licenseService.saveAll).toHaveBeenCalledWith([]);
      expect(taskService.updateTaskResults).toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should retry in-process on failure', async () => {
      const { channel, context } = createMockContext(0);
      accountService.getAccountOrFail.mockRejectedValue(new Error('fail'));

      await controller.licenseResetAccount(payload, context);

      expect(taskService.updateTaskErrors).toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalled();
    });
  });

  // ── licenseResetOrganization ────────────────────────────────────
  describe('licenseResetOrganization', () => {
    const payload = {
      id: 'org-1',
      type: RESET_EVENT_TYPE.LICENSE_RESET_ORGANIZATION,
      task: 'task-3',
    };

    it('should apply license policy and ack on success', async () => {
      const { channel, context } = createMockContext(0);
      const org = { id: 'org-1' };
      organizationLookupService.getOrganizationByIdOrFail.mockResolvedValue(
        org as any
      );
      organizationLicenseService.applyLicensePolicy.mockResolvedValue([]);
      licenseService.saveAll.mockResolvedValue(undefined as any);

      await controller.licenseResetOrganization(payload, context);

      expect(
        organizationLookupService.getOrganizationByIdOrFail
      ).toHaveBeenCalledWith('org-1');
      expect(
        organizationLicenseService.applyLicensePolicy
      ).toHaveBeenCalledWith('org-1');
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should retry in-process on failure', async () => {
      const { channel, context } = createMockContext(0);
      organizationLookupService.getOrganizationByIdOrFail.mockRejectedValue(
        new Error('fail')
      );

      await controller.licenseResetOrganization(payload, context);

      expect(taskService.updateTaskErrors).toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalled();
    });
  });

  // ── authResetPlatform ───────────────────────────────────────────
  describe('authResetPlatform', () => {
    it('should apply platform authorization policy and ack', async () => {
      const { channel, context } = createMockContext(0);
      platformAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined as any);

      await controller.authResetPlatform(context);

      expect(
        platformAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([]);
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      const { channel, context } = createMockContext(2);
      platformAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
        new Error('fail')
      );

      await controller.authResetPlatform(context);

      expect(channel.publish).toHaveBeenCalledWith(
        '',
        MessagingQueue.AUTH_RESET,
        expect.any(Buffer),
        { headers: { 'x-retry-count': 3 }, persistent: true }
      );
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should reject at max retries', async () => {
      const { channel, context } = createMockContext(5);
      platformAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
        new Error('fail')
      );

      await controller.authResetPlatform(context);

      expect(channel.reject).toHaveBeenCalledWith(expect.anything(), false);
    });

    it('should default retryCount to 0 when headers are undefined', async () => {
      const { channel, context } = createMockContext(undefined, false);
      platformAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
        new Error('fail')
      );

      await controller.authResetPlatform(context);

      expect(channel.publish).toHaveBeenCalledWith(
        '',
        MessagingQueue.AUTH_RESET,
        expect.any(Buffer),
        { headers: { 'x-retry-count': 1 }, persistent: true }
      );
      expect(channel.ack).toHaveBeenCalled();
    });
  });

  // ── licenseResetPlatform ────────────────────────────────────────
  describe('licenseResetPlatform', () => {
    it('should apply platform license policy and ack', async () => {
      const { channel, context } = createMockContext(0);
      platformLicenseService.applyLicensePolicy.mockResolvedValue([]);
      licenseService.saveAll.mockResolvedValue(undefined as any);

      await controller.licenseResetPlatform(context);

      expect(platformLicenseService.applyLicensePolicy).toHaveBeenCalled();
      expect(licenseService.saveAll).toHaveBeenCalledWith([]);
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      const { channel, context } = createMockContext(4);
      platformLicenseService.applyLicensePolicy.mockRejectedValue(
        new Error('fail')
      );

      await controller.licenseResetPlatform(context);

      expect(channel.publish).toHaveBeenCalledWith(
        '',
        MessagingQueue.AUTH_RESET,
        expect.any(Buffer),
        { headers: { 'x-retry-count': 5 }, persistent: true }
      );
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should reject at max retries', async () => {
      const { channel, context } = createMockContext(5);
      platformLicenseService.applyLicensePolicy.mockRejectedValue(
        new Error('fail')
      );

      await controller.licenseResetPlatform(context);

      expect(channel.reject).toHaveBeenCalledWith(expect.anything(), false);
    });
  });

  // ── authResetAiServer ───────────────────────────────────────────
  describe('authResetAiServer', () => {
    it('should apply AI server authorization policy and ack', async () => {
      const { channel, context } = createMockContext(0);
      aiServerAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined as any);

      await controller.authResetAiServer(context);

      expect(
        aiServerAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([]);
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      const { channel, context } = createMockContext(1);
      aiServerAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
        new Error('fail')
      );

      await controller.authResetAiServer(context);

      expect(channel.publish).toHaveBeenCalledWith(
        '',
        MessagingQueue.AUTH_RESET,
        expect.any(Buffer),
        { headers: { 'x-retry-count': 2 }, persistent: true }
      );
      expect(channel.ack).toHaveBeenCalled();
    });

    it('should reject at max retries', async () => {
      const { channel, context } = createMockContext(5);
      aiServerAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
        new Error('fail')
      );

      await controller.authResetAiServer(context);

      expect(channel.reject).toHaveBeenCalledWith(expect.anything(), false);
    });
  });

  // ── authResetUser ───────────────────────────────────────────────
  describe('authResetUser', () => {
    const payload = {
      id: 'user-1',
      type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_USER,
      task: 'task-u',
    };

    it('should apply user authorization policy, bulk update, and ack', async () => {
      const { channel, context } = createMockContext(0);
      const user = { id: 'user-1' };
      const policies = [{ id: 'p1' }];
      userService.getUserByIdOrFail.mockResolvedValue(user as any);
      userAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        policies as any
      );
      authorizationPolicyService.bulkUpdate.mockResolvedValue(undefined as any);

      await controller.authResetUser(payload, context);

      expect(userService.getUserByIdOrFail).toHaveBeenCalledWith('user-1');
      expect(
        userAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('user-1');
      expect(authorizationPolicyService.bulkUpdate).toHaveBeenCalledWith(
        policies
      );
      expect(channel.ack).toHaveBeenCalled();
      expect(taskService.updateTaskResults).toHaveBeenCalled();
    });

    it('should retry in-process on failure and still ack', async () => {
      const { channel, context } = createMockContext(0);
      userService.getUserByIdOrFail.mockRejectedValue(new Error('fail'));

      await controller.authResetUser(payload, context);

      expect(taskService.updateTaskErrors).toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalled();
    });
  });

  // ── authResetOrganization ───────────────────────────────────────
  describe('authResetOrganization', () => {
    const payload = {
      id: 'org-1',
      type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_ORGANIZATION,
      task: 'task-o',
    };

    it('should apply organization authorization policy, bulk update, and ack', async () => {
      const { channel, context } = createMockContext(0);
      const org = { id: 'org-1' };
      const policies = [{ id: 'p1' }];
      organizationService.getOrganizationOrFail.mockResolvedValue(org as any);
      organizationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        policies as any
      );
      authorizationPolicyService.bulkUpdate.mockResolvedValue(undefined as any);

      await controller.authResetOrganization(payload, context);

      expect(organizationService.getOrganizationOrFail).toHaveBeenCalledWith(
        'org-1'
      );
      expect(
        organizationAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(org);
      expect(authorizationPolicyService.bulkUpdate).toHaveBeenCalledWith(
        policies
      );
      expect(channel.ack).toHaveBeenCalled();
      expect(taskService.updateTaskResults).toHaveBeenCalled();
    });

    it('should retry in-process on failure and still ack', async () => {
      const { channel, context } = createMockContext(0);
      organizationService.getOrganizationOrFail.mockRejectedValue(
        new Error('fail')
      );

      await controller.authResetOrganization(payload, context);

      expect(taskService.updateTaskErrors).toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalled();
    });
  });
});
