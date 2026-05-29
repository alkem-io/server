import { NotificationEvent } from '@common/enums/notification.event';
import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { PlatformAuditOutcome } from '@src/domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntryRepository } from '@src/domain/community/user-email-change/platform.audit.entry.repository';
import { UserEmailChangeService } from '@src/domain/community/user-email-change/user.email.change.service';
import { UserEmailChangeAuditService } from '@src/domain/community/user-email-change/user.email.change.service.audit';
import { UserEmailChangeSubjectFootprintResolver } from '@src/domain/community/user-email-change/user.email.change.subject.footprint.util';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

/**
 * Per-space email-change fan-out — integration level (FR-016e / SC-011), T045a (c).
 *
 * Unlike the sibling email-change integration specs (which mock
 * `NotificationSpaceAdapter` wholesale) and the service-level unit suite
 * (`user.email.change.service.space.notification.spec.ts`, which stubs the
 * adapter), this spec wires the REAL `NotificationSpaceAdapter` into the flow.
 * Only the true I/O leaves are mocked:
 *   - `NotificationAdapter.getNotificationRecipients` (recipient resolution),
 *   - `SpaceLookupService.getSpaceOrFail` (DB read),
 *   - `NotificationExternalAdapter.sendExternalNotifications` (RabbitMQ emit).
 * So the subject-exclusion filter inside `userEmailChangeSpaceAdmin` runs as
 * real code — this is the layer that proves "N events for N spaces, each with
 * the subject excluded" end-to-end.
 *
 * There is no live RabbitMQ broker in this test folder; the broker boundary is
 * `sendExternalNotifications`, asserted via its mock.
 */

const SUBJECT_ID = 'subject-1';
const ADMIN_ID = 'admin-1';
const KRATOS_ID = 'kratos-1';

const createLogger = (): LoggerService =>
  ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  }) as unknown as LoggerService;

type Recipient = { id: string };
type SpaceFixture = { spaceId: string; recipients: Recipient[] };

interface Harness {
  service: UserEmailChangeService;
  auditEntries: Array<{ outcome: PlatformAuditOutcome }>;
  /** Recorded `sendExternalNotifications(event, payload)` calls. */
  emit: Mock;
  /** Recorded `buildUserEmailChangeSpaceAdminNotificationPayload` calls. */
  buildSpacePayload: Mock;
  kratosState: { emailByIdentityId: Map<string, string> };
  alkemioState: { emailByUserId: Map<string, string> };
}

/**
 * @param spaces            one fixture per space the subject is a member of;
 *                          `recipients` is the raw set `getNotificationRecipients`
 *                          returns BEFORE the adapter's subject-exclusion filter.
 * @param recipientsFailFor space ids for which recipient resolution rejects.
 * @param alkemioFails      fail the Alkemio write (drives rolled_back / drift).
 * @param revertFails       fail the Kratos revert (with `alkemioFails` → drift).
 */
function makeHarness({
  spaces,
  recipientsFailFor = [],
  alkemioFails = false,
  revertFails = false,
}: {
  spaces: SpaceFixture[];
  recipientsFailFor?: string[];
  alkemioFails?: boolean;
  revertFails?: boolean;
}): Harness {
  const initialEmail = 'old@example.com';
  const kratosState = {
    emailByIdentityId: new Map([[KRATOS_ID, initialEmail]]),
  };
  const alkemioState = { emailByUserId: new Map([[SUBJECT_ID, initialEmail]]) };
  const auditEntries: Harness['auditEntries'] = [];

  const auditRepository = {
    appendEmailChangeEntry: vi.fn(async input => {
      const row = { ...input, rowId: auditEntries.length + 1 };
      auditEntries.push(row as any);
      return row;
    }),
    findEmailChangeBySubjectPaged: vi.fn(),
    findLatestEmailChangeBySubject: vi.fn(),
    findLatestUnresolvedDriftBySubject: vi.fn(),
  } as unknown as PlatformAuditEntryRepository;
  const auditService = new UserEmailChangeAuditService(auditRepository);

  const subjectFootprintResolver = {
    buildSubjectFootprint: vi.fn(async () => ({
      spaces: spaces.map(s => ({
        spaceId: s.spaceId,
        level: '0',
        roles: ['member'],
      })),
      organizations: [],
      globalRoles: [],
    })),
  } as unknown as UserEmailChangeSubjectFootprintResolver;

  let kratosWriteCount = 0;
  const kratosService = {
    findIdentityByEmail: vi.fn(async (email: string) => {
      for (const [id, value] of kratosState.emailByIdentityId.entries()) {
        if (value.toLowerCase() === email.toLowerCase()) return { id };
      }
      return null;
    }),
    getIdentityById: vi.fn(async (id: string) =>
      kratosState.emailByIdentityId.has(id) ? { id } : undefined
    ),
    getIdentityEmailTrait: vi.fn(async (id: string) =>
      kratosState.emailByIdentityId.get(id)
    ),
    updateIdentityEmailTrait: vi.fn(async (id: string, newEmail: string) => {
      kratosWriteCount += 1;
      // First write is the forward commit; a later write is the revert.
      if (kratosWriteCount > 1 && revertFails) {
        throw new Error('revert kratos down');
      }
      kratosState.emailByIdentityId.set(id, newEmail);
      return { id };
    }),
    invalidateAllIdentitySessions: vi.fn(async () => {}),
  } as unknown as KratosService;

  const userService = {
    getUserByEmail: vi.fn(async () => null),
    save: vi.fn(async (user: any) => {
      if (alkemioFails) throw new Error('typeorm failed');
      alkemioState.emailByUserId.set(user.id, user.email);
      return user;
    }),
  } as unknown as UserService;

  const userLookupService = {
    getUserByIdOrFail: vi.fn(async (id: string) => ({
      id,
      authenticationID: KRATOS_ID,
      email: alkemioState.emailByUserId.get(id) ?? initialEmail,
      profile: { displayName: id === ADMIN_ID ? 'Polly' : 'Alice' },
    })),
  } as unknown as UserLookupService;

  // --- Real NotificationSpaceAdapter, mocked leaves ---------------------------
  const emit = vi.fn();
  const buildSpacePayload = vi.fn(
    async (
      _event: NotificationEvent,
      eventData: any,
      recipients: Recipient[],
      space: any
    ) => ({
      recipients,
      spaceID: space.id,
      triggerOutcome: eventData.triggerOutcome,
    })
  );
  // One NotificationExternalAdapter mock covers BOTH the service's direct
  // publishes and the space adapter's payload-build + emit.
  const externalAdapter = {
    publishEmailChangeSecuritySignal: vi.fn(async () => {}),
    publishEmailChangeNewAddressNotification: vi.fn(async () => {}),
    buildUserEmailChangeSpaceAdminNotificationPayload: buildSpacePayload,
    sendExternalNotifications: emit,
  } as unknown as NotificationExternalAdapter;

  const recipientResolver = {
    getNotificationRecipients: vi.fn(
      async (_event: NotificationEvent, _data: any, spaceID: string) => {
        if (recipientsFailFor.includes(spaceID)) {
          throw new Error('recipient resolution down');
        }
        const fixture = spaces.find(s => s.spaceId === spaceID);
        return {
          emailRecipients: (fixture?.recipients ?? []) as any,
          inAppRecipients: [],
          pushRecipients: [],
        };
      }
    ),
  };

  const spaceLookupService = {
    getSpaceOrFail: vi.fn(async (spaceID: string) => ({
      id: spaceID,
      about: { profile: { displayName: `Space ${spaceID}` } },
    })),
  };

  const notificationSpaceAdapter = new NotificationSpaceAdapter(
    createLogger(),
    externalAdapter,
    undefined as any, // notificationInAppAdapter — unused by userEmailChangeSpaceAdmin
    undefined as any, // notificationPushAdapter — unused
    recipientResolver as any, // notificationAdapter — getNotificationRecipients only
    undefined as any, // notificationUserAdapter — unused
    undefined as any, // communityResolverService — unused
    spaceLookupService as any,
    undefined as any, // urlGeneratorService — unused
    userLookupService,
    undefined as any // calloutLookupService — unused
  );

  const notificationPlatformAdapter = {
    userEmailChangeGlobalAdmin: vi.fn(async () => {}),
  } as unknown as NotificationPlatformAdapter;

  const configService = {
    get: vi.fn().mockReturnValue('http://localhost:3000'),
  } as unknown as ConfigService<any, true>;

  const service = new UserEmailChangeService(
    auditRepository,
    auditService,
    subjectFootprintResolver,
    kratosService,
    externalAdapter,
    notificationPlatformAdapter,
    notificationSpaceAdapter,
    userService,
    userLookupService,
    configService,
    createLogger()
  );

  return {
    service,
    auditEntries,
    emit,
    buildSpacePayload,
    kratosState,
    alkemioState,
  };
}

const apply = (service: UserEmailChangeService) =>
  service.applyAdminEmailChange(
    ADMIN_ID,
    SUBJECT_ID,
    'new@example.com',
    'support ticket #4821',
    {
      name: 'Jane Approver',
      role: 'Organization Administrator',
    }
  );

/** Raw recipient set for a space: two real recipients + the subject. */
const spaceWithSubject = (spaceId: string): SpaceFixture => ({
  spaceId,
  recipients: [
    { id: `admin-of-${spaceId}` },
    { id: `lead-of-${spaceId}` },
    { id: SUBJECT_ID },
  ],
});

const spaceEvents = (emit: Mock): any[] =>
  emit.mock.calls.filter(
    c => c[0] === NotificationEvent.USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION
  );

const spaceFailedCount = (auditEntries: Harness['auditEntries']): number =>
  auditEntries.filter(
    e => e.outcome === PlatformAuditOutcome.SPACE_ADMIN_NOTIFICATION_FAILED
  ).length;

describe('Integration — per-space email-change fan-out (FR-016e / SC-011)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('committed, subject in N=3 spaces → emits exactly 3 space events, subject excluded from each', async () => {
    const harness = makeHarness({
      spaces: [
        spaceWithSubject('s-1'),
        spaceWithSubject('s-2'),
        spaceWithSubject('s-3'),
      ],
    });

    const result = await apply(harness.service);
    expect(result.success).toBe(true);

    // The commit landed on both sides.
    expect(harness.kratosState.emailByIdentityId.get(KRATOS_ID)).toBe(
      'new@example.com'
    );
    expect(harness.alkemioState.emailByUserId.get(SUBJECT_ID)).toBe(
      'new@example.com'
    );

    // Exactly one space event per space, in footprint order.
    const events = spaceEvents(harness.emit);
    expect(events).toHaveLength(3);
    expect(events.map(e => e[1].spaceID)).toEqual(['s-1', 's-2', 's-3']);

    // Every space event's recipient list excludes the change's subject but
    // keeps that space's admins/leads — this filter is real adapter code.
    for (const [, payload] of events) {
      const recipientIds = payload.recipients.map((r: Recipient) => r.id);
      expect(recipientIds).not.toContain(SUBJECT_ID);
      expect(recipientIds).toContain(`admin-of-${payload.spaceID}`);
      expect(recipientIds).toContain(`lead-of-${payload.spaceID}`);
      expect(payload.triggerOutcome).toBe('COMMITTED');
    }

    // No failure audit rows.
    expect(spaceFailedCount(harness.auditEntries)).toBe(0);
  });

  it('committed, subject in N=0 spaces → emits zero space events', async () => {
    const harness = makeHarness({ spaces: [] });

    await apply(harness.service);

    expect(spaceEvents(harness.emit)).toHaveLength(0);
    expect(spaceFailedCount(harness.auditEntries)).toBe(0);
  });

  it('a space whose only recipient is the subject → that space emits nothing (others unaffected)', async () => {
    const harness = makeHarness({
      spaces: [
        spaceWithSubject('s-1'),
        // s-2's raw recipient set is the subject alone → empty after exclusion.
        { spaceId: 's-2', recipients: [{ id: SUBJECT_ID }] },
      ],
    });

    await apply(harness.service);

    const events = spaceEvents(harness.emit);
    // Only s-1 produces an event; s-2 short-circuits inside the adapter.
    expect(events.map(e => e[1].spaceID)).toEqual(['s-1']);
    // The short-circuit is not a failure — no audit row for s-2.
    expect(spaceFailedCount(harness.auditEntries)).toBe(0);
  });

  it('one space fails recipient resolution → other spaces still emit, one failure audited, commit stands', async () => {
    const harness = makeHarness({
      spaces: [
        spaceWithSubject('s-1'),
        spaceWithSubject('s-2'),
        spaceWithSubject('s-3'),
      ],
      recipientsFailFor: ['s-2'],
    });

    const result = await apply(harness.service);
    expect(result.success).toBe(true);

    // s-1 and s-3 still emit; s-2 does not.
    const events = spaceEvents(harness.emit);
    expect(events.map(e => e[1].spaceID)).toEqual(['s-1', 's-3']);

    // Exactly one space_admin_notification_failed row (for s-2).
    expect(spaceFailedCount(harness.auditEntries)).toBe(1);

    // The commit itself stands.
    expect(
      harness.auditEntries.some(
        e => e.outcome === PlatformAuditOutcome.COMMITTED
      )
    ).toBe(true);
  }, 15000);

  it('drift_detected, subject in N=2 spaces → emits 2 space events with DRIFT_DETECTED trigger', async () => {
    const harness = makeHarness({
      spaces: [spaceWithSubject('s-1'), spaceWithSubject('s-2')],
      alkemioFails: true,
      revertFails: true,
    });

    await expect(apply(harness.service)).rejects.toBeDefined();

    const events = spaceEvents(harness.emit);
    expect(events).toHaveLength(2);
    for (const [, payload] of events) {
      expect(payload.triggerOutcome).toBe('DRIFT_DETECTED');
      expect(payload.recipients.map((r: Recipient) => r.id)).not.toContain(
        SUBJECT_ID
      );
    }
  }, 15000);
});
