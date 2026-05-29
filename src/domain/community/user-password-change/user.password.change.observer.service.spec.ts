import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { PlatformAuditInitiatorRole } from '../user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '../user-email-change/enums/platform.audit.outcome';
import { UserPasswordChangeAuditService } from './user.password.change.audit.service';
import { UserPasswordChangeObserverService } from './user.password.change.observer.service';

const noopLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  verbose: vi.fn(),
} as const;

interface MockUserLookup {
  getUserByAuthenticationID: Mock;
}
interface MockAudit {
  record: Mock;
}
interface MockNotifications {
  publishPasswordChangeSecuritySignal: Mock;
}

function buildService(overrides: {
  user?: { id: string; email: string } | null;
  publishImpl?: () => Promise<void>;
}) {
  const userLookup: MockUserLookup = {
    getUserByAuthenticationID: vi.fn(async () => overrides.user ?? null),
  };
  const audit: MockAudit = {
    record: vi.fn(async () => ({})),
  };
  const notifications: MockNotifications = {
    publishPasswordChangeSecuritySignal: vi.fn(
      overrides.publishImpl ?? (async () => undefined)
    ),
  };
  const service = new UserPasswordChangeObserverService(
    audit as unknown as UserPasswordChangeAuditService,
    userLookup as unknown as never,
    notifications as unknown as never,
    noopLogger as unknown as never
  );
  return { service, audit, notifications, userLookup };
}

describe('UserPasswordChangeObserverService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records OBSERVED and publishes the security signal for a linked user', async () => {
    const { service, audit, notifications } = buildService({
      user: { id: 'user-1', email: 'user@example.com' },
    });

    const result = await service.handleObservedPasswordChange({
      identityId: 'kratos-1',
      observedAt: '2026-05-27T10:00:00.000Z',
      sourceFlowId: 'flow-xyz',
    });

    expect(result).toEqual({ recorded: true });
    expect(audit.record).toHaveBeenCalledTimes(1);
    const auditArg = audit.record.mock.calls[0][0];
    expect(auditArg).toMatchObject({
      subjectUserId: 'user-1',
      initiatorUserId: 'user-1',
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      outcome: PlatformAuditOutcome.OBSERVED,
      observedAt: '2026-05-27T10:00:00.000Z',
      sourceFlowId: 'flow-xyz',
    });
    expect(auditArg.correlationId).toBeTruthy();

    expect(
      notifications.publishPasswordChangeSecuritySignal
    ).toHaveBeenCalledTimes(1);
    expect(
      notifications.publishPasswordChangeSecuritySignal.mock.calls[0][0]
    ).toEqual({
      recipientEmail: 'user@example.com',
      observedAtISO8601: '2026-05-27T10:00:00.000Z',
    });
  });

  it('drops the event without auditing when the Kratos identity has no Alkemio user', async () => {
    const { service, audit, notifications } = buildService({ user: null });

    const result = await service.handleObservedPasswordChange({
      identityId: 'orphan-identity',
    });

    expect(result).toEqual({ recorded: false });
    expect(audit.record).not.toHaveBeenCalled();
    expect(
      notifications.publishPasswordChangeSecuritySignal
    ).not.toHaveBeenCalled();
  });

  it('defaults observedAt to now when the upstream did not supply one', async () => {
    const { service, audit, notifications } = buildService({
      user: { id: 'user-1', email: 'user@example.com' },
    });

    const before = Date.now();
    await service.handleObservedPasswordChange({ identityId: 'kratos-1' });
    const after = Date.now();

    const auditArg = audit.record.mock.calls[0][0];
    const auditObservedAt = Date.parse(auditArg.observedAt);
    expect(auditObservedAt).toBeGreaterThanOrEqual(before);
    expect(auditObservedAt).toBeLessThanOrEqual(after);
    expect(
      notifications.publishPasswordChangeSecuritySignal.mock.calls[0][0]
        .observedAtISO8601
    ).toBe(auditArg.observedAt);
  });

  it('records SECURITY_SIGNAL_FAILED when the notification publish exhausts its retry budget', async () => {
    const { service, audit, notifications } = buildService({
      user: { id: 'user-1', email: 'user@example.com' },
      publishImpl: async () => {
        throw new Error('ECONNREFUSED rabbitmq');
      },
    });

    const result = await service.handleObservedPasswordChange({
      identityId: 'kratos-1',
      observedAt: '2026-05-27T10:00:00.000Z',
    });

    expect(result).toEqual({ recorded: true });
    // The publish itself is retried by retryWithBackoff (3 attempts by default).
    expect(
      notifications.publishPasswordChangeSecuritySignal.mock.calls.length
    ).toBeGreaterThan(1);
    // Two audit rows: OBSERVED then SECURITY_SIGNAL_FAILED.
    expect(audit.record).toHaveBeenCalledTimes(2);
    const outcomes = audit.record.mock.calls.map(c => c[0].outcome);
    expect(outcomes).toEqual([
      PlatformAuditOutcome.OBSERVED,
      PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
    ]);
    // Failure reason is normalised (no raw error message leaks).
    const failArg = audit.record.mock.calls[1][0];
    expect(failArg.failureReason).toBe('broker_unreachable');
    // Both rows share a correlationId.
    expect(audit.record.mock.calls[0][0].correlationId).toBe(
      failArg.correlationId
    );
  }, 30_000);
});
