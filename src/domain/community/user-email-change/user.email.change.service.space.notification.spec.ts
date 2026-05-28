import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformAuditOutcome } from './enums/platform.audit.outcome';
import { PlatformAuditEntryRepository } from './platform.audit.entry.repository';
import { UserEmailChangeService } from './user.email.change.service';
import { UserEmailChangeAuditService } from './user.email.change.service.audit';
import { UserEmailChangeSubjectFootprintResolver } from './user.email.change.subject.footprint.util';

/**
 * Per-space email-change fan-out (FR-016e / SC-011).
 *
 * Scope: this suite asserts the SERVICE-layer contract of
 * `publishSpaceAdminNotifications` — that exactly one
 * `USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION` event is published per space the
 * subject is a member of, that per-space failures are isolated and audited, and
 * that the commit always stands. Recipient resolution (a space's admins/leads,
 * the no-`RECEIVE_NOTIFICATIONS_ADMIN`-filter rule, and subject exclusion) lives
 * inside `NotificationSpaceAdapter` and is covered by its own / integration
 * tests — not here.
 */

const createLogger = (): LoggerService =>
  ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  }) as unknown as LoggerService;

type FootprintSpace = { spaceId: string; level: number; roles: string[] };

const space = (id: string): FootprintSpace => ({
  spaceId: id,
  level: 0,
  roles: ['member'],
});

function harness({
  footprintSpaces = [],
  footprintFails = false,
  spaceAdapterFailFor = [],
  alkemioFails = false,
  revertFails = false,
}: {
  footprintSpaces?: FootprintSpace[];
  footprintFails?: boolean;
  spaceAdapterFailFor?: string[];
  /** Fail the Alkemio `User.email` write. With `revertFails: false` this drives
   *  the rolled_back path; with `revertFails: true` it drives drift_detected. */
  alkemioFails?: boolean;
  /** Fail the compensating Kratos revert (only meaningful with `alkemioFails`). */
  revertFails?: boolean;
} = {}) {
  const auditRows: any[] = [];
  const repository = {
    appendEmailChangeEntry: vi.fn(async input => {
      const row = { ...input, rowId: auditRows.length + 1 };
      auditRows.push(row);
      return row;
    }),
    findEmailChangeBySubjectPaged: vi.fn(),
    findLatestEmailChangeBySubject: vi.fn(),
    findLatestUnresolvedDriftBySubject: vi.fn(),
  } as unknown as PlatformAuditEntryRepository;
  const audit = new UserEmailChangeAuditService(repository);

  // The forward Kratos write always succeeds in this suite; a second call is
  // the compensating revert, which fails when `revertFails` is set.
  let kratosCallCount = 0;
  const kratosService = {
    findIdentityByEmail: vi.fn().mockResolvedValue(null),
    getIdentityById: vi.fn().mockResolvedValue({ id: 'kratos-1' }),
    getIdentityEmailTrait: vi.fn(),
    updateIdentityEmailTrait: vi.fn(async (_id: string, email: string) => {
      kratosCallCount += 1;
      if (kratosCallCount > 1 && revertFails) {
        throw new Error('revert kratos down');
      }
      return { id: 'kratos-1', email };
    }),
    invalidateAllIdentitySessions: vi.fn().mockResolvedValue(undefined),
  } as unknown as KratosService;

  const userService = {
    getUserByEmail: vi.fn().mockResolvedValue(null),
    save: vi.fn(async (u: any) => {
      if (alkemioFails) throw new Error('typeorm failed');
      return u;
    }),
  } as unknown as UserService;

  const userLookupService = {
    getUserByIdOrFail: vi.fn(async (id: string) => ({
      id,
      authenticationID: 'kratos-1',
      email: 'old@example.com',
      profile: { displayName: 'Subject' },
    })),
  } as unknown as UserLookupService;

  const notificationAdapter = {
    publishEmailChangeSecuritySignal: vi.fn().mockResolvedValue(undefined),
    publishEmailChangeNewAddressNotification: vi
      .fn()
      .mockResolvedValue(undefined),
  } as unknown as NotificationExternalAdapter;

  const notificationPlatformAdapter = {
    userEmailChangeGlobalAdmin: vi.fn().mockResolvedValue(undefined),
  } as unknown as NotificationPlatformAdapter;

  const spaceAdmin = vi.fn(async (_eventData: any, spaceId: string) => {
    if (spaceAdapterFailFor.includes(spaceId)) {
      throw new Error('space publish down');
    }
  });
  const notificationSpaceAdapter = {
    userEmailChangeSpaceAdmin: spaceAdmin,
  } as unknown as NotificationSpaceAdapter;

  const subjectFootprintResolver = {
    buildSubjectFootprint: vi.fn(async () => {
      if (footprintFails) throw new Error('footprint resolution down');
      return {
        spaces: footprintSpaces,
        organizations: [],
        globalRoles: [],
      };
    }),
  } as unknown as UserEmailChangeSubjectFootprintResolver;

  const configService = {
    get: vi.fn().mockReturnValue('http://localhost:3000'),
  } as unknown as ConfigService<any, true>;

  const service = new UserEmailChangeService(
    repository,
    audit,
    subjectFootprintResolver,
    kratosService,
    notificationAdapter,
    notificationPlatformAdapter,
    notificationSpaceAdapter,
    userService,
    userLookupService,
    configService,
    createLogger()
  );
  return { service, auditRows, spaceAdmin };
}

const TEST_REASON = 'support ticket #4821';
const TEST_APPROVER = {
  name: 'Jane Approver',
  role: 'Organization Administrator',
};

const apply = (service: UserEmailChangeService, newEmail = 'new@example.com') =>
  service.applyAdminEmailChange(
    'admin-1',
    'subject-1',
    newEmail,
    TEST_REASON,
    TEST_APPROVER
  );

const spaceFailedCount = (auditRows: any[]): number =>
  auditRows.filter(
    r => r.outcome === PlatformAuditOutcome.SPACE_ADMIN_NOTIFICATION_FAILED
  ).length;

describe('UserEmailChangeService — per-space fan-out (FR-016e / SC-011)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('committed, subject in N=3 spaces → publishes exactly 3 events, one per space', async () => {
    const { service, spaceAdmin } = harness({
      footprintSpaces: [space('s-1'), space('s-2'), space('s-3')],
    });

    await apply(service);

    expect(spaceAdmin).toHaveBeenCalledTimes(3);
    expect(spaceAdmin.mock.calls.map(c => c[1])).toEqual(['s-1', 's-2', 's-3']);
    // Every event carries the COMMITTED trigger and the subject identity.
    for (const [eventData, _spaceId] of spaceAdmin.mock.calls) {
      expect(eventData.triggerOutcome).toBe('COMMITTED');
      expect(eventData.subjectUserID).toBe('subject-1');
    }
  });

  it('committed, subject in N=1 space → publishes exactly one event', async () => {
    const { service, spaceAdmin } = harness({
      footprintSpaces: [space('s-1')],
    });

    await apply(service);

    expect(spaceAdmin).toHaveBeenCalledTimes(1);
    expect(spaceAdmin.mock.calls[0][1]).toBe('s-1');
  });

  it('committed, subject in N=0 spaces → publishes nothing, no failure audit', async () => {
    const { service, auditRows, spaceAdmin } = harness({ footprintSpaces: [] });

    await apply(service);

    expect(spaceAdmin).not.toHaveBeenCalled();
    expect(spaceFailedCount(auditRows)).toBe(0);
  });

  it('drift_detected, subject in N=2 spaces → publishes 2 events with DRIFT_DETECTED trigger', async () => {
    const { service, spaceAdmin } = harness({
      alkemioFails: true,
      revertFails: true,
      footprintSpaces: [space('s-1'), space('s-2')],
    });

    await expect(apply(service)).rejects.toBeDefined();

    expect(spaceAdmin).toHaveBeenCalledTimes(2);
    for (const [eventData] of spaceAdmin.mock.calls) {
      expect(eventData.triggerOutcome).toBe('DRIFT_DETECTED');
    }
  }, 15000);

  it('rolled_back attempt → no per-space event is published', async () => {
    // Forward Kratos succeeds, Alkemio fails, revert succeeds → ROLLED_BACK.
    // The post-commit chain (per-space fan-out included) is never reached.
    const { service, auditRows, spaceAdmin } = harness({
      alkemioFails: true,
      revertFails: false,
      footprintSpaces: [space('s-1')],
    });

    await expect(apply(service)).rejects.toBeDefined();

    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.ROLLED_BACK)
    ).toBe(true);
    expect(spaceAdmin).not.toHaveBeenCalled();
    expect(spaceFailedCount(auditRows)).toBe(0);
  }, 15000);

  it('rejected (no-change) attempt → no per-space event is published', async () => {
    const { service, spaceAdmin } = harness({
      footprintSpaces: [space('s-1')],
    });

    // newEmail equals the subject's current email → rejected before any commit.
    await expect(apply(service, 'old@example.com')).rejects.toBeDefined();

    expect(spaceAdmin).not.toHaveBeenCalled();
  });

  it('one space fails to publish → other spaces still published, one failure audited, commit stands', async () => {
    const { service, auditRows, spaceAdmin } = harness({
      footprintSpaces: [space('s-1'), space('s-2'), space('s-3')],
      spaceAdapterFailFor: ['s-2'],
    });

    await apply(service);

    // All three spaces are attempted — the middle failure does not abort
    // the loop. The failing space (s-2) is retried to exhaustion (3 attempts)
    // by the bounded retry helper; the healthy spaces are published once.
    const ids = spaceAdmin.mock.calls.map(c => c[1]);
    expect(ids.filter(id => id === 's-1')).toHaveLength(1);
    expect(ids.filter(id => id === 's-2')).toHaveLength(3);
    expect(ids.filter(id => id === 's-3')).toHaveLength(1);
    // s-3 is attempted only AFTER s-2's retries are exhausted → the loop
    // continued past the failure rather than aborting.
    expect(ids.indexOf('s-3')).toBeGreaterThan(ids.lastIndexOf('s-2'));
    // Exactly one space_admin_notification_failed row — for s-2 only.
    expect(spaceFailedCount(auditRows)).toBe(1);
    // The commit itself stands.
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.COMMITTED)
    ).toBe(true);
  }, 15000);

  it('subject-footprint resolution fails → single failure audit, no per-space event, commit stands', async () => {
    const { service, auditRows, spaceAdmin } = harness({
      footprintFails: true,
      footprintSpaces: [space('s-1'), space('s-2')],
    });

    await apply(service);

    expect(spaceAdmin).not.toHaveBeenCalled();
    // The footprint resolver also backs the global-admin fan-out, so a
    // resolution failure can audit that event too — but the per-space path
    // must contribute exactly ONE space_admin_notification_failed row.
    expect(spaceFailedCount(auditRows)).toBe(1);
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.COMMITTED)
    ).toBe(true);
  }, 15000);
});
