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
import { UserEmailChangeErrorCode } from '@src/domain/community/user-email-change/user.email.change.errors';
import { UserEmailChangeService } from '@src/domain/community/user-email-change/user.email.change.service';
import { UserEmailChangeAuditService } from '@src/domain/community/user-email-change/user.email.change.service.audit';
import { UserEmailChangeSubjectFootprintResolver } from '@src/domain/community/user-email-change/user.email.change.subject.footprint.util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createLogger = (): LoggerService =>
  ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  }) as unknown as LoggerService;

describe('Integration — adminUserEmailChange validation (Scenario 2)', () => {
  let auditRows: any[];
  let service: UserEmailChangeService;
  let kratosService: KratosService & Record<string, any>;

  beforeEach(() => {
    vi.restoreAllMocks();
    auditRows = [];
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

    kratosService = {
      findIdentityByEmail: vi.fn().mockResolvedValue(null),
      getIdentityById: vi.fn().mockResolvedValue({ id: 'kratos-1' }),
      getIdentityEmailTrait: vi.fn(),
      updateIdentityEmailTrait: vi.fn(),
      invalidateAllIdentitySessions: vi.fn(),
    } as any;

    const userService = {
      // Simulate Bob owning bob@test.alkem.io
      getUserByEmail: vi.fn(async (email: string) =>
        email.toLowerCase() === 'bob@test.alkem.io'
          ? { id: 'bob-user-id' }
          : null
      ),
      save: vi.fn(),
    } as unknown as UserService;

    const userLookupService = {
      getUserByIdOrFail: vi.fn(async (id: string) => ({
        id,
        authenticationID: 'kratos-1',
        email: 'alice+v2@test.alkem.io',
        profile: { displayName: 'Alice' },
      })),
    } as unknown as UserLookupService;

    const notificationAdapter = {
      publishEmailChangeSecuritySignal: vi.fn(),
      publishEmailChangeNewAddressNotification: vi.fn(),
    } as unknown as NotificationExternalAdapter;

    const notificationPlatformAdapter = {
      userEmailChangeGlobalAdmin: vi.fn(),
    } as unknown as NotificationPlatformAdapter;

    const notificationSpaceAdapter = {
      userEmailChangeSpaceAdmin: vi.fn(),
    } as unknown as NotificationSpaceAdapter;

    const subjectFootprintResolver = {
      buildSubjectFootprint: vi.fn(),
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
      createLogger()
    );
  });

  it('malformed → EMAIL_CHANGE_VALIDATION + REJECTED_VALIDATION audit; no Kratos call', async () => {
    await expect(
      service.applyAdminEmailChange(
        'admin-1',
        'alice-id',
        'not-an-email',
        'support ticket #4821',
        { name: 'Jane Approver', role: 'Organization Administrator' }
      )
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_VALIDATION,
    });
    expect(kratosService.updateIdentityEmailTrait).not.toHaveBeenCalled();
    expect(
      auditRows.find(
        r => r.outcome === PlatformAuditOutcome.REJECTED_VALIDATION
      )?.failureReason
    ).toBe('malformed_email');
  });

  it('same-as-current → EMAIL_CHANGE_NO_CHANGE + REJECTED_VALIDATION/no_change', async () => {
    await expect(
      service.applyAdminEmailChange(
        'admin-1',
        'alice-id',
        'alice+v2@test.alkem.io',
        'support ticket #4821',
        { name: 'Jane Approver', role: 'Organization Administrator' }
      )
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_NO_CHANGE,
    });
    expect(kratosService.updateIdentityEmailTrait).not.toHaveBeenCalled();
    expect(
      auditRows.find(
        r => r.outcome === PlatformAuditOutcome.REJECTED_VALIDATION
      )?.failureReason
    ).toBe('no_change');
  });

  it('conflict (Alkemio holds the address) → EMAIL_CHANGE_CONFLICT + non-leaky failureReason', async () => {
    await expect(
      service.applyAdminEmailChange(
        'admin-1',
        'alice-id',
        'bob@test.alkem.io',
        'support ticket #4821',
        { name: 'Jane Approver', role: 'Organization Administrator' }
      )
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_CONFLICT,
    });
    expect(kratosService.updateIdentityEmailTrait).not.toHaveBeenCalled();
    const row = auditRows.find(
      r => r.outcome === PlatformAuditOutcome.REJECTED_CONFLICT
    );
    expect(row?.failureReason).toBe('conflict');
    // Anti-enumeration: failureReason MUST NOT reveal the conflict-holder.
    expect(row?.failureReason).not.toMatch(/bob/i);
  });
});
