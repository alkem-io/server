import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { PlatformAuditInitiatorRole } from './enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from './enums/platform.audit.outcome';
import { PlatformAuditEntryRepository } from './platform.audit.entry.repository';
import { UserEmailChangeAuditService } from './user.email.change.service.audit';

const ALL_EMAIL_CHANGE_OUTCOMES: PlatformAuditOutcome[] = [
  PlatformAuditOutcome.COMMITTED,
  PlatformAuditOutcome.ROLLED_BACK,
  PlatformAuditOutcome.DRIFT_DETECTED,
  PlatformAuditOutcome.DRIFT_RESOLVED,
  PlatformAuditOutcome.DRIFT_RESOLUTION_FAILED,
  PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
  PlatformAuditOutcome.NEW_ADDRESS_NOTIFICATION_FAILED,
  PlatformAuditOutcome.GLOBAL_ADMIN_NOTIFICATION_FAILED,
  PlatformAuditOutcome.SESSION_INVALIDATION_FAILED,
  PlatformAuditOutcome.REJECTED_VALIDATION,
  PlatformAuditOutcome.REJECTED_CONFLICT,
];

describe('UserEmailChangeAuditService', () => {
  let repo: { appendEmailChangeEntry: Mock };
  let service: UserEmailChangeAuditService;

  beforeEach(() => {
    repo = {
      appendEmailChangeEntry: vi.fn(async input => ({ ...input, rowId: 1 })),
    };
    service = new UserEmailChangeAuditService(
      repo as unknown as PlatformAuditEntryRepository
    );
  });

  it.each(
    ALL_EMAIL_CHANGE_OUTCOMES
  )('writes exactly one row for outcome %s', async outcome => {
    await service.record({
      subjectUserId: 'subject-1',
      initiatorUserId: 'admin-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome,
      oldEmail: 'old@example.com',
      newEmail: 'new@example.com',
      correlationId: 'corr-1',
    });
    expect(repo.appendEmailChangeEntry).toHaveBeenCalledTimes(1);
    const arg = repo.appendEmailChangeEntry.mock.calls[0][0];
    expect(arg.outcome).toBe(outcome);
    expect(arg.details).toEqual({
      oldEmail: 'old@example.com',
      newEmail: 'new@example.com',
    });
  });

  it('rejects an outcome that is not in the email-change subset (per-category guard)', async () => {
    await expect(
      service.record({
        subjectUserId: 'subject-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
        // A future-category outcome value the email-change subset rejects.
        outcome: 'initiated' as unknown as PlatformAuditOutcome,
      })
    ).rejects.toThrow(/not a valid email-change outcome/);
  });

  it('does NOT write a `token` key into details (token-leakage guard)', async () => {
    await service.record({
      subjectUserId: 'subject-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome: PlatformAuditOutcome.COMMITTED,
      oldEmail: 'old@example.com',
      newEmail: 'new@example.com',
    });
    const arg = repo.appendEmailChangeEntry.mock.calls[0][0];
    expect(arg.details).not.toHaveProperty('token');
  });

  it('omits oldEmail / newEmail keys when not provided', async () => {
    await service.record({
      subjectUserId: 'subject-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome: PlatformAuditOutcome.REJECTED_VALIDATION,
    });
    const arg = repo.appendEmailChangeEntry.mock.calls[0][0];
    expect(arg.details).toBeUndefined();
  });

  it('passes through correlationId so callers can chain rows', async () => {
    await service.record({
      subjectUserId: 'subject-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome: PlatformAuditOutcome.COMMITTED,
      correlationId: 'shared-corr',
    });
    expect(repo.appendEmailChangeEntry.mock.calls[0][0].correlationId).toBe(
      'shared-corr'
    );
  });

  it('does not write account-enumeration content into failureReason (max 128 chars)', async () => {
    const longReason = 'x'.repeat(200);
    await service.record({
      subjectUserId: 'subject-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome: PlatformAuditOutcome.REJECTED_CONFLICT,
      failureReason: longReason,
    });
    const arg = repo.appendEmailChangeEntry.mock.calls[0][0];
    expect(arg.failureReason.length).toBeLessThanOrEqual(128);
  });
});
