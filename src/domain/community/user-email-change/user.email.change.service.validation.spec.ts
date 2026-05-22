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
import { UserEmailChangeErrorCode } from './user.email.change.errors';
import { UserEmailChangeService } from './user.email.change.service';
import { UserEmailChangeAuditService } from './user.email.change.service.audit';
import { UserEmailChangeSubjectFootprintResolver } from './user.email.change.subject.footprint.util';

const createLogger = (): LoggerService =>
  ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  }) as unknown as LoggerService;

function makeService({
  conflictAlkemio = false,
  conflictKratos = false,
  subjectEmail = 'current@example.com',
}: {
  conflictAlkemio?: boolean;
  conflictKratos?: boolean;
  subjectEmail?: string;
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

  const kratosService = {
    findIdentityByEmail: vi
      .fn()
      .mockResolvedValue(conflictKratos ? { id: 'other-kratos' } : null),
    getIdentityById: vi.fn().mockResolvedValue({ id: 'kratos-1' }),
    getIdentityEmailTrait: vi.fn(),
    updateIdentityEmailTrait: vi.fn(),
    invalidateAllIdentitySessions: vi.fn(),
  } as unknown as KratosService;

  const userService = {
    getUserByEmail: vi.fn(async () =>
      conflictAlkemio ? { id: 'other-user' } : null
    ),
    save: vi.fn(),
  } as unknown as UserService;

  const userLookupService = {
    getUserByIdOrFail: vi.fn(async () => ({
      id: 'subject-1',
      authenticationID: 'kratos-1',
      email: subjectEmail,
      profile: { displayName: 'Subject' },
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
  return { service, auditRows, kratosService, userService };
}

const TEST_REASON = 'support ticket #4821';
const TEST_APPROVER = {
  name: 'Jane Approver',
  role: 'Organization Administrator',
};

describe('UserEmailChangeService — validation rejections', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects malformed email; writes REJECTED_VALIDATION; no Kratos calls', async () => {
    const { service, auditRows, kratosService } = makeService();
    await expect(
      service.applyAdminEmailChange(
        'admin-1',
        'subject-1',
        'not-an-email',
        TEST_REASON,
        TEST_APPROVER
      )
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_VALIDATION,
    });
    expect(kratosService.updateIdentityEmailTrait).not.toHaveBeenCalled();
    const row = auditRows.find(
      r => r.outcome === PlatformAuditOutcome.REJECTED_VALIDATION
    );
    expect(row).toBeDefined();
    expect(row?.failureReason).toBe('malformed_email');
  });

  it('rejects same-as-current; writes REJECTED_VALIDATION with no_change reason', async () => {
    const { service, auditRows, kratosService } = makeService({
      subjectEmail: 'current@example.com',
    });
    await expect(
      service.applyAdminEmailChange(
        'admin-1',
        'subject-1',
        'current@example.com',
        TEST_REASON,
        TEST_APPROVER
      )
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_NO_CHANGE,
    });
    expect(kratosService.updateIdentityEmailTrait).not.toHaveBeenCalled();
    const row = auditRows.find(
      r => r.outcome === PlatformAuditOutcome.REJECTED_VALIDATION
    );
    expect(row?.failureReason).toBe('no_change');
  });

  it('rejects conflict on Alkemio side; failure reason is generic "conflict"', async () => {
    const { service, auditRows, kratosService } = makeService({
      conflictAlkemio: true,
    });
    await expect(
      service.applyAdminEmailChange(
        'admin-1',
        'subject-1',
        'other@example.com',
        TEST_REASON,
        TEST_APPROVER
      )
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_CONFLICT,
    });
    expect(kratosService.updateIdentityEmailTrait).not.toHaveBeenCalled();
    const row = auditRows.find(
      r => r.outcome === PlatformAuditOutcome.REJECTED_CONFLICT
    );
    expect(row).toBeDefined();
    expect(row?.failureReason).toBe('conflict');
  });

  it('rejects conflict on Kratos side with identical generic reason (anti-enumeration)', async () => {
    const { service, auditRows } = makeService({ conflictKratos: true });
    await expect(
      service.applyAdminEmailChange(
        'admin-1',
        'subject-1',
        'other@example.com',
        TEST_REASON,
        TEST_APPROVER
      )
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_CONFLICT,
    });
    const row = auditRows.find(
      r => r.outcome === PlatformAuditOutcome.REJECTED_CONFLICT
    );
    expect(row?.failureReason).toBe('conflict');
  });
});
