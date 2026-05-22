import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { PlatformAuditInitiatorRole } from '@src/domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@src/domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntryRepository } from '@src/domain/community/user-email-change/platform.audit.entry.repository';
import { UserEmailChangeErrorCode } from '@src/domain/community/user-email-change/user.email.change.errors';
import { UserEmailChangeService } from '@src/domain/community/user-email-change/user.email.change.service';
import { UserEmailChangeAuditService } from '@src/domain/community/user-email-change/user.email.change.service.audit';
import { UserEmailChangeSubjectFootprintResolver } from '@src/domain/community/user-email-change/user.email.change.subject.footprint.util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createLogger = (): LoggerService & { error: any } =>
  ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  }) as unknown as LoggerService & { error: any };

describe('Integration — drift detection + reconciliation (Scenario 4)', () => {
  let auditRows: any[];
  let service: UserEmailChangeService;
  let logger: LoggerService & { error: any };
  let globalAdminPublish: any;
  let driftRepoState: any[];

  beforeEach(() => {
    vi.restoreAllMocks();
    auditRows = [];
    driftRepoState = [];
    logger = createLogger();

    const repository = {
      appendEmailChangeEntry: vi.fn(async input => {
        const row = { ...input, rowId: auditRows.length + 1 };
        auditRows.push(row);
        if (input.outcome === PlatformAuditOutcome.DRIFT_DETECTED) {
          driftRepoState.push(row);
        }
        return row;
      }),
      findEmailChangeBySubjectPaged: vi.fn(),
      findLatestEmailChangeBySubject: vi.fn(),
      findLatestUnresolvedDriftBySubject: vi.fn(async () => {
        const lastResolved = auditRows
          .filter(r => r.outcome === PlatformAuditOutcome.DRIFT_RESOLVED)
          .pop();
        const lastDetected = driftRepoState[driftRepoState.length - 1];
        if (!lastDetected) return null;
        if (lastResolved && lastResolved.rowId > lastDetected.rowId) {
          return null;
        }
        return lastDetected;
      }),
    } as unknown as PlatformAuditEntryRepository;
    const audit = new UserEmailChangeAuditService(repository);

    let kratosCallCount = 0;
    const kratosService = {
      findIdentityByEmail: vi.fn().mockResolvedValue(null),
      getIdentityById: vi.fn().mockResolvedValue({ id: 'kratos-1' }),
      getIdentityEmailTrait: vi.fn(async () => 'new@example.com'),
      updateIdentityEmailTrait: vi.fn(async (_id: string, _email: string) => {
        kratosCallCount += 1;
        // Forward write (first call): SUCCEEDS — needed so the Alkemio path runs.
        // After Alkemio fails, the revert path retries the Kratos write
        // 3 times and exhausts the budget (Scenario 4 double-fault).
        if (kratosCallCount === 1) {
          return { id: 'kratos-1' };
        }
        throw new Error('kratos revert unreachable');
      }),
      invalidateAllIdentitySessions: vi.fn(),
    } as unknown as KratosService;

    const userService = {
      getUserByEmail: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (_u: any) => {
        throw new Error('alkemio write failed');
      }),
    } as unknown as UserService;

    const userLookupService = {
      getUserByIdOrFail: vi.fn(async (id: string) => ({
        id,
        authenticationID: 'kratos-1',
        email: 'old@example.com',
        profile: { displayName: 'Alice' },
      })),
    } as unknown as UserLookupService;

    globalAdminPublish = vi.fn().mockResolvedValue(undefined);
    const notificationAdapter = {
      publishEmailChangeSecuritySignal: vi.fn(),
      publishEmailChangeNewAddressNotification: vi.fn(),
    } as unknown as NotificationExternalAdapter;

    const notificationPlatformAdapter = {
      userEmailChangeGlobalAdmin: globalAdminPublish,
    } as unknown as NotificationPlatformAdapter;

    const notificationSpaceAdapter = {
      userEmailChangeSpaceAdmin: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationSpaceAdapter;

    const subjectFootprintResolver = {
      buildSubjectFootprint: vi.fn(async () => ({
        spaces: [],
        organizations: [],
        globalRoles: [],
      })),
    } as unknown as UserEmailChangeSubjectFootprintResolver;

    const configService = {
      get: vi.fn().mockReturnValue('http://localhost:3000'),
    } as unknown as ConfigService<any, true>;

    service = new UserEmailChangeService(
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
      logger
    );
  });

  it('writes DRIFT_DETECTED + emits Winston error + publishes GA notification', async () => {
    await expect(
      service.applyAdminEmailChange('admin-1', 'subject-1', 'new@example.com')
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_DETECTED,
    });

    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.DRIFT_DETECTED)
    ).toBe(true);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('email_change_drift_detected'),
      expect.any(String),
      expect.any(String)
    );

    // GA notification published with triggerOutcome: DRIFT_DETECTED.
    expect(globalAdminPublish).toHaveBeenCalledTimes(1);
    expect(globalAdminPublish.mock.calls[0][0].triggerOutcome).toBe(
      'DRIFT_DETECTED'
    );
  });
});
