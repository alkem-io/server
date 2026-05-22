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

describe('Integration — adminUserEmailChange rollback (Scenario 3)', () => {
  let auditRows: any[];
  let service: UserEmailChangeService;
  let kratosEmailById: Map<string, string>;
  let alkemioEmailById: Map<string, string>;

  beforeEach(() => {
    vi.restoreAllMocks();
    auditRows = [];
    kratosEmailById = new Map([['kratos-1', 'old@example.com']]);
    alkemioEmailById = new Map([['subject-1', 'old@example.com']]);

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

    // Forward Kratos write always rejects to simulate the Scenario 3 fault.
    const kratosService = {
      findIdentityByEmail: vi.fn().mockResolvedValue(null),
      getIdentityById: vi.fn().mockResolvedValue({ id: 'kratos-1' }),
      getIdentityEmailTrait: vi.fn(),
      updateIdentityEmailTrait: vi
        .fn()
        .mockRejectedValue(new Error('forward kratos timed out')),
      invalidateAllIdentitySessions: vi.fn(),
    } as unknown as KratosService;

    const userService = {
      getUserByEmail: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
    } as unknown as UserService;

    const userLookupService = {
      getUserByIdOrFail: vi.fn(async (id: string) => ({
        id,
        authenticationID: 'kratos-1',
        email: alkemioEmailById.get(id) ?? 'old@example.com',
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
      createLogger()
    );
  });

  it('rolls back when forward Kratos exhausts retries', async () => {
    await expect(
      service.applyAdminEmailChange('admin-1', 'subject-1', 'new@example.com')
    ).rejects.toMatchObject({
      code: expect.stringMatching(
        /^(EMAIL_CHANGE_KRATOS_WRITE_FAILED|EMAIL_CHANGE_KRATOS_UNREACHABLE)$/
      ),
    });

    // No side held the new email.
    expect(kratosEmailById.get('kratos-1')).toBe('old@example.com');
    expect(alkemioEmailById.get('subject-1')).toBe('old@example.com');

    // Audit ROLLED_BACK written.
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.ROLLED_BACK)
    ).toBe(true);
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.COMMITTED)
    ).toBe(false);
  });
});
