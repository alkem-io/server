import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntryRepository } from '@domain/community/user-email-change/platform.audit.entry.repository';
import { EntityManager } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionAuditService } from './account.deletion.audit.service';

describe('AccountDeletionAuditService', () => {
  let service: AccountDeletionAuditService;
  let repository: PlatformAuditEntryRepository;

  beforeEach(() => {
    repository = {
      appendAccountDeletionEntry: vi.fn().mockResolvedValue({ id: 'row-1' }),
    } as unknown as PlatformAuditEntryRepository;
    service = new AccountDeletionAuditService(repository);
  });

  it('writes the primary record using the passed transactional EntityManager', async () => {
    const em = { id: 'em' } as unknown as EntityManager;

    await service.writePrimary(em, {
      subjectUserId: 'user-1',
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      accountID: 'account-1',
      externalSubscriptionID: 'wingback-1',
      documentCount: 3,
    });

    expect(repository.appendAccountDeletionEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectUserId: 'user-1',
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        outcome: PlatformAuditOutcome.ACCOUNT_DELETED,
        details: expect.objectContaining({
          accountID: 'account-1',
          blockerCheck: 'pass',
          externalSubscriptionID: 'wingback-1',
          documentCount: 3,
        }),
      }),
      em
    );
  });

  it('never includes email or displayName keys in the primary details', async () => {
    const em = {} as unknown as EntityManager;
    await service.writePrimary(em, {
      subjectUserId: 'user-1',
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      accountID: 'account-1',
      documentCount: 0,
    });

    const [[input]] = (repository.appendAccountDeletionEntry as any).mock.calls;
    expect(input.details).not.toHaveProperty('email');
    expect(input.details).not.toHaveProperty('displayName');
    expect(input.details).not.toHaveProperty('userEmail');
    expect(input.details).not.toHaveProperty('userDisplayName');
  });

  it('appends a leg outcome without an EntityManager (post-commit, best-effort)', async () => {
    await service.appendLegOutcome(
      'user-1',
      PlatformAuditInitiatorRole.SELF,
      PlatformAuditOutcome.IDENTITY_DELETION_FAILED,
      { error: 'KratosUnreachable: timeout' }
    );

    expect(repository.appendAccountDeletionEntry).toHaveBeenCalledWith({
      subjectUserId: 'user-1',
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome: PlatformAuditOutcome.IDENTITY_DELETION_FAILED,
      details: { error: 'KratosUnreachable: timeout' },
    });
  });
});
