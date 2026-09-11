// Falsification-first mechanism spec for the account-deletion transaction
// (Fork 5 / research R3 ordering): proves that every primary-store write in
// RegistrationService.deleteUserWithPendingMemberships' deletion tree joins
// the SAME transactional EntityManager, and that a throw at the last
// in-transaction step propagates out with no post-throw work — the
// post-commit legs (session revocation, Kratos identity, stored-file bytes)
// never run when the primary-store commit itself never happened.
//
// House style: written the way
// test/integration/email-change/user-email-change-rollback.spec.ts pins its
// service's transactional behavior — a NestJS TestingModule around the real
// service with every collaborator auto-mocked, no live database. What this
// spec CANNOT observe (a real Postgres rollback) is exactly the gap the
// companion manual probe (test/utils/probe-delete-rollback.ts) closes.
//
// This spec is the acceptance test for the transaction repair: against the
// pre-repair code (RegistrationService called userService.deleteUser() and
// accountService.deleteAccountOrFail() with no EntityManager parameter at
// all, and each of those opened its OWN independent
// `repository.manager.transaction(...)`), the "same EntityManager" assertion
// below has no argument to compare — there is no shared em to thread. It
// only becomes meaningful, and passes, once every write in the tree accepts
// and joins one caller-supplied EntityManager.
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { AccountDeletionAuditService } from '@domain/community/user/account-deletion/account.deletion.audit.service';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AccountService } from '@domain/space/account/account.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { RegistrationService } from '@src/services/api/registration/registration.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { type Mock, vi } from 'vitest';

describe('Integration — account-deletion transaction mechanism (falsification-first)', () => {
  let service: RegistrationService;
  let invitationService: {
    findInvitationsForActor: Mock;
    deleteInvitation: Mock;
  };
  let applicationService: {
    findApplicationsForUser: Mock;
    deleteApplication: Mock;
  };
  let userService: {
    getUserByIdOrFail: Mock;
    getAccount: Mock;
    deleteUserDbOnly: Mock;
    revokeUserSessionsAndIdentity: Mock;
  };
  let accountService: { deleteAccountOrFailForAccountDeletion: Mock };
  let accountDeletionAuditService: {
    writePrimary: Mock;
    appendLegOutcome: Mock;
  };
  let fileServiceAdapter: { deleteDocument: Mock };
  let storageBucketService: { removeStorageBucketRowForAccountDeletion: Mock };

  const REAL_TRANSACTION_MARKER = {
    isTheOneTransactionalEntityManager: true,
  } as unknown as EntityManager;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: {
            // Faithfully mimics TypeORM: the callback is awaited, and a
            // rejection propagates out of transaction() unchanged — nothing
            // "commits" and nothing after the throw runs.
            transaction: vi.fn(
              async (cb: (em: EntityManager) => Promise<unknown>) =>
                cb(REAL_TRANSACTION_MARKER)
            ),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RegistrationService);
    invitationService = module.get(InvitationService) as any;
    applicationService = module.get(ApplicationService) as any;
    userService = module.get(UserService) as any;
    accountService = module.get(AccountService) as any;
    accountDeletionAuditService = module.get(
      AccountDeletionAuditService
    ) as any;
    fileServiceAdapter = module.get(FileServiceAdapter) as any;
    storageBucketService = module.get(StorageBucketService) as any;

    // Silence unrelated providers this module resolves but this spec does
    // not exercise (registerNewUser/createOrganization machinery, etc.).
    module.get(UserAuthorizationService);
    module.get(AccountAuthorizationService);
    module.get(AuthorizationPolicyService);
    module.get(OrganizationLookupService);
    module.get(OrganizationService);
    module.get(PlatformInvitationService);
    module.get(InvitationAuthorizationService);
    module.get(RoleSetService);
    module.get(NotificationPlatformAdapter);
    module.get(ConfigService);

    invitationService.findInvitationsForActor.mockResolvedValue([
      { id: 'inv-1' },
    ]);
    invitationService.deleteInvitation.mockResolvedValue(undefined);
    applicationService.findApplicationsForUser.mockResolvedValue([
      { id: 'app-1' },
    ]);
    applicationService.deleteApplication.mockResolvedValue(undefined);
    userService.getUserByIdOrFail.mockResolvedValue({ id: 'user-1' });
    userService.getAccount.mockResolvedValue({
      id: 'account-1',
      externalSubscriptionID: undefined,
    });
    userService.deleteUserDbOnly.mockResolvedValue({
      user: { id: 'user-1' },
      documentIDs: ['doc-1'],
      storageBucketIDs: ['sb-1'],
    });
    accountService.deleteAccountOrFailForAccountDeletion.mockResolvedValue({
      account: { id: 'account-1' },
      documentIDs: ['doc-2'],
      storageBucketIDs: ['sb-2'],
    });
    accountDeletionAuditService.writePrimary.mockResolvedValue(undefined);
    accountDeletionAuditService.appendLegOutcome.mockResolvedValue(undefined);
    userService.revokeUserSessionsAndIdentity.mockResolvedValue({
      sessionRevocationSucceeded: true,
      identityDeletionAttempted: false,
      identityDeletionSucceeded: false,
    });
    fileServiceAdapter.deleteDocument.mockResolvedValue(undefined);
    storageBucketService.removeStorageBucketRowForAccountDeletion.mockResolvedValue(
      undefined
    );
  });

  it('threads the SAME transactional EntityManager to every primary-store write in the deletion tree', async () => {
    await service.deleteUserWithPendingMemberships(
      { ID: 'user-1' } as any,
      'self'
    );

    expect(invitationService.deleteInvitation).toHaveBeenCalledWith(
      { ID: 'inv-1' },
      REAL_TRANSACTION_MARKER
    );
    expect(applicationService.deleteApplication).toHaveBeenCalledWith(
      { ID: 'app-1' },
      REAL_TRANSACTION_MARKER
    );
    expect(userService.deleteUserDbOnly).toHaveBeenCalledWith(
      { ID: 'user-1' },
      REAL_TRANSACTION_MARKER,
      'self'
    );
    expect(
      accountService.deleteAccountOrFailForAccountDeletion
    ).toHaveBeenCalledWith(
      { id: 'account-1', externalSubscriptionID: undefined },
      REAL_TRANSACTION_MARKER
    );
    expect(accountDeletionAuditService.writePrimary).toHaveBeenCalledWith(
      REAL_TRANSACTION_MARKER,
      expect.anything()
    );
  });

  it('a throw at the LAST in-transaction step (the primary audit write) propagates with no post-throw work: no post-commit legs run', async () => {
    const failure = new Error(
      'simulated failure at the last transactional step'
    );
    accountDeletionAuditService.writePrimary.mockRejectedValue(failure);

    await expect(
      service.deleteUserWithPendingMemberships({ ID: 'user-1' } as any, 'self')
    ).rejects.toThrow(failure);

    // Every write up to the failure point was still attempted (proving the
    // failure is genuinely at the LAST step, not an early short-circuit)...
    expect(userService.deleteUserDbOnly).toHaveBeenCalled();
    expect(
      accountService.deleteAccountOrFailForAccountDeletion
    ).toHaveBeenCalled();

    // ...but nothing that only runs after a successful commit ran: the
    // primary-store transaction rejected, so none of the post-commit,
    // best-effort external legs fire. A rolled-back deletion must not
    // revoke sessions, delete the Kratos identity, or delete file bytes.
    expect(userService.revokeUserSessionsAndIdentity).not.toHaveBeenCalled();
    expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    expect(accountDeletionAuditService.appendLegOutcome).not.toHaveBeenCalled();
    expect(
      storageBucketService.removeStorageBucketRowForAccountDeletion
    ).not.toHaveBeenCalled();
  });

  it('a throw at an EARLIER step (application deletion) still propagates with no later writes and no post-commit legs', async () => {
    const failure = new Error(
      'simulated failure deleting a pending application'
    );
    applicationService.deleteApplication.mockRejectedValue(failure);

    await expect(
      service.deleteUserWithPendingMemberships({ ID: 'user-1' } as any, 'self')
    ).rejects.toThrow(failure);

    expect(userService.deleteUserDbOnly).not.toHaveBeenCalled();
    expect(
      accountService.deleteAccountOrFailForAccountDeletion
    ).not.toHaveBeenCalled();
    expect(accountDeletionAuditService.writePrimary).not.toHaveBeenCalled();
    expect(userService.revokeUserSessionsAndIdentity).not.toHaveBeenCalled();
  });
});
