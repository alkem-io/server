import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { PlatformAuditInitiatorRole } from '../user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '../user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntryRepository } from '../user-email-change/platform.audit.entry.repository';
import { UserPasswordChangeAuditService } from './user.password.change.audit.service';

const ALL_PASSWORD_CHANGE_OUTCOMES: PlatformAuditOutcome[] = [
  PlatformAuditOutcome.OBSERVED,
  PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
];

describe('UserPasswordChangeAuditService', () => {
  let repo: { appendPasswordChangeEntry: Mock };
  let service: UserPasswordChangeAuditService;

  beforeEach(() => {
    repo = {
      appendPasswordChangeEntry: vi.fn(async input => ({ ...input, rowId: 1 })),
    };
    service = new UserPasswordChangeAuditService(
      repo as unknown as PlatformAuditEntryRepository
    );
  });

  it.each(
    ALL_PASSWORD_CHANGE_OUTCOMES
  )('writes exactly one row for outcome %s', async outcome => {
    await service.record({
      subjectUserId: 'subject-1',
      initiatorUserId: 'subject-1',
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome,
      observedAt: '2026-05-27T10:00:00.000Z',
      sourceFlowId: 'flow-1',
      correlationId: 'corr-1',
    });
    expect(repo.appendPasswordChangeEntry).toHaveBeenCalledTimes(1);
    const arg = repo.appendPasswordChangeEntry.mock.calls[0][0];
    expect(arg.outcome).toBe(outcome);
    expect(arg.details).toEqual({
      observedAt: '2026-05-27T10:00:00.000Z',
      sourceFlowId: 'flow-1',
    });
  });

  it('rejects an outcome that is not in the password-change subset', async () => {
    await expect(
      service.record({
        subjectUserId: 'subject-1',
        initiatorRole: PlatformAuditInitiatorRole.SELF,
        outcome: PlatformAuditOutcome.COMMITTED,
      })
    ).rejects.toThrow(/not a valid password-change outcome/);
  });

  it('never writes credential-like keys into details', async () => {
    await service.record({
      subjectUserId: 'subject-1',
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome: PlatformAuditOutcome.OBSERVED,
      observedAt: '2026-05-27T10:00:00.000Z',
    });
    const arg = repo.appendPasswordChangeEntry.mock.calls[0][0];
    expect(arg.details).not.toHaveProperty('password');
    expect(arg.details).not.toHaveProperty('passwordHash');
    expect(arg.details).not.toHaveProperty('token');
  });

  it('omits details entirely when no observation fields are supplied', async () => {
    await service.record({
      subjectUserId: 'subject-1',
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome: PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
    });
    const arg = repo.appendPasswordChangeEntry.mock.calls[0][0];
    expect(arg.details).toBeUndefined();
  });

  it('truncates a long failure reason to fit the 128-char column', async () => {
    await service.record({
      subjectUserId: 'subject-1',
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome: PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
      failureReason: 'x'.repeat(200),
    });
    const arg = repo.appendPasswordChangeEntry.mock.calls[0][0];
    expect(arg.failureReason.length).toBeLessThanOrEqual(128);
  });
});
