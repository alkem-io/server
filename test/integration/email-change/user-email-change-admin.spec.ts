import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { PlatformAuditInitiatorRole } from '@src/domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@src/domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntryRepository } from '@src/domain/community/user-email-change/platform.audit.entry.repository';
import { UserEmailChangeService } from '@src/domain/community/user-email-change/user.email.change.service';
import { UserEmailChangeAuditService } from '@src/domain/community/user-email-change/user.email.change.service.audit';
import { UserEmailChangeSubjectFootprintResolver } from '@src/domain/community/user-email-change/user.email.change.subject.footprint.util';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

const createLogger = (): LoggerService =>
  ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  }) as unknown as LoggerService;

interface Harness {
  service: UserEmailChangeService;
  auditEntries: Array<{
    outcome: PlatformAuditOutcome;
    oldEmail?: string;
    newEmail?: string;
    failureReason?: string;
    correlationId?: string;
  }>;
  notificationsClient: {
    securitySignal: Mock;
    newAddress: Mock;
    globalAdmin: Mock;
  };
  kratosState: { emailByIdentityId: Map<string, string> };
  alkemioState: { emailByUserId: Map<string, string> };
}

function makeHarness({ initialEmail = 'old@example.com' } = {}): Harness {
  const subjectId = 'subject-1';
  const kratosId = 'kratos-1';
  const adminId = 'admin-1';

  const kratosState = {
    emailByIdentityId: new Map([[kratosId, initialEmail]]),
  };
  const alkemioState = { emailByUserId: new Map([[subjectId, initialEmail]]) };

  const auditEntries: Harness['auditEntries'] = [];

  const auditRepository = {
    appendEmailChangeEntry: vi.fn(async input => {
      const row = {
        ...input,
        category: 'email_change',
        id: `row-${auditEntries.length + 1}`,
        rowId: auditEntries.length + 1,
        createdDate: new Date(),
        updatedDate: new Date(),
      };
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
      spaces: [{ spaceId: 'space-1', level: '0', roles: ['member'] }],
      organizations: [{ organizationId: 'org-1', roles: ['admin'] }],
      globalRoles: [],
    })),
  } as unknown as UserEmailChangeSubjectFootprintResolver;

  const kratosService = {
    findIdentityByEmail: vi.fn(async (email: string) => {
      for (const [id, value] of kratosState.emailByIdentityId.entries()) {
        if (value.toLowerCase() === email.toLowerCase()) {
          return { id };
        }
      }
      return null;
    }),
    getIdentityEmailTrait: vi.fn(async (id: string) =>
      kratosState.emailByIdentityId.get(id)
    ),
    updateIdentityEmailTrait: vi.fn(async (id: string, newEmail: string) => {
      kratosState.emailByIdentityId.set(id, newEmail);
      return { id };
    }),
    invalidateAllIdentitySessions: vi.fn(async () => {}),
  } as unknown as KratosService;

  const userService = {
    getUserByEmail: vi.fn(async () => null),
    save: vi.fn(async (user: any) => {
      alkemioState.emailByUserId.set(user.id, user.email);
      return user;
    }),
  } as unknown as UserService;

  const userLookupService = {
    getUserByIdOrFail: vi.fn(async (id: string) => ({
      id,
      authenticationID: kratosId,
      email: alkemioState.emailByUserId.get(id) ?? initialEmail,
      profile: { displayName: id === adminId ? 'Polly' : 'Alice' },
    })),
  } as unknown as UserLookupService;

  const securitySignal = vi.fn(async () => {});
  const newAddress = vi.fn(async () => {});
  const globalAdmin = vi.fn(async () => {});
  const notificationAdapter = {
    publishEmailChangeSecuritySignal: securitySignal,
    publishEmailChangeNewAddressNotification: newAddress,
    publishEmailChangeGlobalAdminNotification: globalAdmin,
  } as unknown as NotificationExternalAdapter;

  const configService = {
    get: vi.fn().mockReturnValue('http://localhost:3000'),
  } as unknown as ConfigService<any, true>;

  const service = new UserEmailChangeService(
    auditRepository,
    auditService,
    subjectFootprintResolver,
    kratosService,
    notificationAdapter,
    userService,
    userLookupService,
    configService,
    createLogger()
  );

  return {
    service,
    auditEntries,
    notificationsClient: {
      securitySignal,
      newAddress,
      globalAdmin,
    },
    kratosState,
    alkemioState,
  };
}

describe('Integration — adminUserEmailChange happy path (Scenario 1)', () => {
  let harness: Harness;

  beforeEach(() => {
    vi.restoreAllMocks();
    harness = makeHarness();
  });

  it('commits across both sides and produces a single COMMITTED audit row', async () => {
    const result = await harness.service.applyAdminEmailChange(
      'admin-1',
      'subject-1',
      'new@example.com'
    );

    expect(result).toEqual({ success: true, email: 'new@example.com' });

    // Both sides hold the new email.
    expect(harness.kratosState.emailByIdentityId.get('kratos-1')).toBe(
      'new@example.com'
    );
    expect(harness.alkemioState.emailByUserId.get('subject-1')).toBe(
      'new@example.com'
    );

    // Audit committed row written exactly once with correct payload (the
    // details JSONB column carries oldEmail / newEmail per the email-change
    // category contract).
    const commitRows = harness.auditEntries.filter(
      e => e.outcome === PlatformAuditOutcome.COMMITTED
    );
    expect(commitRows).toHaveLength(1);
    expect((commitRows[0] as any).details.oldEmail).toBe('old@example.com');
    expect((commitRows[0] as any).details.newEmail).toBe('new@example.com');

    // FR-012 proxy: after commit, Kratos lookup of OLD email returns null.
    const kratosLookupOld =
      harness.kratosState.emailByIdentityId.get('kratos-1');
    expect(kratosLookupOld).not.toBe('old@example.com');

    // All three post-commit notifications published.
    expect(harness.notificationsClient.securitySignal).toHaveBeenCalledTimes(1);
    expect(harness.notificationsClient.newAddress).toHaveBeenCalledTimes(1);
    expect(harness.notificationsClient.globalAdmin).toHaveBeenCalledTimes(1);

    // Global-admin payload carries the subject footprint.
    const gaPayload = harness.notificationsClient.globalAdmin.mock.calls[0][0];
    expect(gaPayload.triggerOutcome).toBe('COMMITTED');
    expect(gaPayload.subjectMemberships.spaces).toEqual([
      { spaceId: 'space-1', level: '0', roles: ['member'] },
    ]);
    expect(gaPayload.subjectMemberships.organizations).toEqual([
      { organizationId: 'org-1', roles: ['admin'] },
    ]);
  });

  it('per-event publish failure produces matching *_failed audit row but commit stands', async () => {
    harness.notificationsClient.securitySignal.mockRejectedValue(
      new Error('mq down')
    );

    const result = await harness.service.applyAdminEmailChange(
      'admin-1',
      'subject-1',
      'new@example.com'
    );

    expect(result.success).toBe(true);

    // Commit row present.
    expect(
      harness.auditEntries.filter(
        e => e.outcome === PlatformAuditOutcome.COMMITTED
      )
    ).toHaveLength(1);

    // security_signal_failed row present.
    expect(
      harness.auditEntries.filter(
        e => e.outcome === PlatformAuditOutcome.SECURITY_SIGNAL_FAILED
      )
    ).toHaveLength(1);

    // The other two notifications still fired.
    expect(harness.notificationsClient.newAddress).toHaveBeenCalledTimes(1);
    expect(harness.notificationsClient.globalAdmin).toHaveBeenCalledTimes(1);
  });
});
