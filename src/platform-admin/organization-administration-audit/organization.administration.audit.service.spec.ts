import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { OrganizationAdministrationAction } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import {
  orgAdminActor,
  supportActor,
} from '@test/utils/org.community.policy.fixture';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mock, vi } from 'vitest';
import { OrganizationAdministrationAuditService } from './organization.administration.audit.service';

describe('OrganizationAdministrationAuditService', () => {
  let service: OrganizationAdministrationAuditService;
  let repo: { create: Mock; save: Mock; createQueryBuilder: Mock };
  let organizationLookupService: { getOrganizationForRoleSetOrFail: Mock };
  let logger: { error: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();
    repo = {
      create: vi.fn(entry => entry),
      save: vi.fn().mockResolvedValue(undefined),
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationAdministrationAuditService,
        MockWinstonProvider,
        { provide: getRepositoryToken(PlatformAuditEntry), useValue: repo },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(OrganizationAdministrationAuditService);
    organizationLookupService = module.get(OrganizationLookupService) as any;
    organizationLookupService.getOrganizationForRoleSetOrFail.mockResolvedValue(
      { id: 'org-1' }
    );
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER) as any;
    logger.error.mockClear();
  });

  const expectedOutcome: Record<
    OrganizationAdministrationAction,
    PlatformAuditOutcome
  > = {
    invite_user: PlatformAuditOutcome.OPERATION_SUCCEEDED,
    invite_email: PlatformAuditOutcome.OPERATION_SUCCEEDED,
    resend_email_invitation: PlatformAuditOutcome.OPERATION_SUCCEEDED,
    revoke_user_invitation: PlatformAuditOutcome.OPERATION_SUCCEEDED,
    revoke_email_invitation: PlatformAuditOutcome.OPERATION_SUCCEEDED,
    approve_application: PlatformAuditOutcome.ROLE_GRANTED,
    reject_application: PlatformAuditOutcome.OPERATION_SUCCEEDED,
    archive_application: PlatformAuditOutcome.OPERATION_SUCCEEDED,
    reopen_application: PlatformAuditOutcome.OPERATION_SUCCEEDED,
    mark_application_approved: PlatformAuditOutcome.OPERATION_SUCCEEDED,
    assign_role: PlatformAuditOutcome.ROLE_GRANTED,
    remove_role: PlatformAuditOutcome.ROLE_REVOKED,
    remove_member: PlatformAuditOutcome.ROLE_REVOKED,
    extra_role_honoured: PlatformAuditOutcome.ROLE_GRANTED,
    extra_role_withheld: PlatformAuditOutcome.OPERATION_SUCCEEDED,
  };

  it.each(
    Object.entries(expectedOutcome) as [
      OrganizationAdministrationAction,
      PlatformAuditOutcome,
    ][]
  )('writes exactly one %s row with outcome %s and the full column set', async (action, outcome) => {
    await service.record({
      actorContext: supportActor('support-1'),
      roleSetId: 'rs-1',
      action,
      targetUserId: 'target-1',
      roles: ['admin'],
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    const entry = repo.create.mock.calls[0][0];
    expect(entry).toMatchObject({
      category: PlatformAuditCategory.ORGANIZATION_ADMINISTRATION,
      subjectUserId: 'target-1',
      subjectOrganizationId: 'org-1',
      initiatorUserId: 'support-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_SUPPORT,
      outcome,
    });
    expect(entry.details.action).toBe(action);
    expect(entry.details.roleSetId).toBe('rs-1');
    expect(
      organizationLookupService.getOrganizationForRoleSetOrFail
    ).toHaveBeenCalledWith('rs-1');
  });

  it('identifies an email invitation by id only: NULL subject and no address anywhere in the row', async () => {
    await service.record({
      actorContext: supportActor('support-1'),
      roleSetId: 'rs-1',
      action: 'invite_email',
      platformInvitationId: 'pinv-1',
      roles: ['admin'],
    });

    const entry = repo.create.mock.calls[0][0];
    expect(entry.subjectUserId).toBeUndefined();
    expect(entry.details).toEqual({
      action: 'invite_email',
      roleSetId: 'rs-1',
      roles: ['admin'],
      platformInvitationId: 'pinv-1',
    });
    expect(JSON.stringify(entry)).not.toContain('@');
  });

  it('carries reason and withheld roles only on a withheld row', async () => {
    await service.record({
      actorContext: supportActor('support-1'),
      roleSetId: 'rs-1',
      action: 'extra_role_withheld',
      targetUserId: 'invitee-1',
      withheldRoles: ['owner'],
      reason: 'role_limits',
      invitationId: 'inv-1',
    });
    await service.record({
      actorContext: supportActor('support-1'),
      roleSetId: 'rs-1',
      action: 'assign_role',
      targetUserId: 'target-1',
      roles: ['admin'],
      reason: 'role_limits',
    });

    const withheld = repo.create.mock.calls[0][0];
    expect(withheld.details).toEqual({
      action: 'extra_role_withheld',
      roleSetId: 'rs-1',
      withheldRoles: ['owner'],
      reason: 'role_limits',
      invitationId: 'inv-1',
    });
    const granted = repo.create.mock.calls[1][0];
    expect(granted.details.reason).toBeUndefined();
    expect(granted.details.withheldRoles).toBeUndefined();
  });

  it('records a standing-lost withholding as platform_support even though the offerer no longer holds the credential', async () => {
    await service.record({
      actorContext: orgAdminActor('former-support'),
      roleSetId: 'rs-1',
      action: 'extra_role_withheld',
      targetUserId: 'invitee-1',
      withheldRoles: ['admin'],
      reason: 'standing_lost',
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.create.mock.calls[0][0].initiatorRole).toBe(
      PlatformAuditInitiatorRole.PLATFORM_SUPPORT
    );
  });

  it('is FAIL-OPEN: a rejected save resolves, logs once at error level and throws nothing', async () => {
    repo.save.mockRejectedValueOnce(new Error('audit store down'));

    await expect(
      service.record({
        actorContext: supportActor('support-1'),
        roleSetId: 'rs-1',
        action: 'assign_role',
        targetUserId: 'target-1',
        roles: ['admin'],
      })
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('is FAIL-OPEN on the organization lookup too: no row, one error log', async () => {
    organizationLookupService.getOrganizationForRoleSetOrFail.mockRejectedValueOnce(
      new Error('not found')
    );

    await expect(
      service.record({
        actorContext: supportActor('support-1'),
        roleSetId: 'rs-1',
        action: 'remove_member',
        targetUserId: 'target-1',
      })
    ).resolves.toBeUndefined();
    expect(repo.save).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  describe('wasOfferedOnSupportPath', () => {
    const queryBuilder = (count: number | Error) => {
      const qb: any = {
        where: vi.fn(() => qb),
        andWhere: vi.fn(() => qb),
        getCount:
          count instanceof Error
            ? vi.fn().mockRejectedValue(count)
            : vi.fn().mockResolvedValue(count),
      };
      return qb;
    };

    it('is true when a Support invite row by the offerer exists for the role set', async () => {
      const qb = queryBuilder(1);
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.wasOfferedOnSupportPath('offerer-1', 'invitee-1', 'rs-1')
      ).resolves.toBe(true);
      expect(qb.where).toHaveBeenCalledWith('entry.category = :category', {
        category: PlatformAuditCategory.ORGANIZATION_ADMINISTRATION,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'entry.initiatorUserId = :offererID',
        { offererID: 'offerer-1' }
      );
    });

    it('is false without such a row, and fails open to false on a store error', async () => {
      repo.createQueryBuilder.mockReturnValueOnce(queryBuilder(0));
      await expect(
        service.wasOfferedOnSupportPath('offerer-1', 'invitee-1', 'rs-1')
      ).resolves.toBe(false);

      repo.createQueryBuilder.mockReturnValueOnce(
        queryBuilder(new Error('down'))
      );
      await expect(
        service.wasOfferedOnSupportPath('offerer-1', 'invitee-1', 'rs-1')
      ).resolves.toBe(false);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
