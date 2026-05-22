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
import {
  UserEmailChangeErrorCode,
  UserEmailChangeException,
} from './user.email.change.errors';
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

function harness({
  kratosForwardFails,
  kratosRevertFails,
  alkemioFails,
}: {
  kratosForwardFails?: boolean;
  kratosRevertFails?: boolean;
  alkemioFails?: boolean;
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

  const kratosForward = vi.fn();
  if (kratosForwardFails) {
    kratosForward.mockRejectedValue(new Error('forward kratos down'));
  } else {
    kratosForward.mockResolvedValue({});
  }

  let revertCallCount = 0;
  const kratosService = {
    findIdentityByEmail: vi.fn().mockResolvedValue(null),
    getIdentityById: vi.fn().mockResolvedValue({ id: 'kratos-1' }),
    getIdentityEmailTrait: vi.fn(),
    updateIdentityEmailTrait: vi.fn(async (_id: string, email: string) => {
      // First (or only) call is the forward write; subsequent calls are reverts.
      revertCallCount += 1;
      if (revertCallCount === 1 && !kratosForwardFails) {
        return { id: 'kratos-1', email };
      }
      if (kratosForwardFails) {
        throw new Error('forward kratos down');
      }
      // Revert path
      if (kratosRevertFails) throw new Error('revert kratos down');
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
    getUserByIdOrFail: vi.fn(async () => ({
      id: 'subject-1',
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
  return { service, auditRows, repository, kratosService };
}

describe('UserEmailChangeService — three commit outcomes via fault injection', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('happy path → commits and writes COMMITTED', async () => {
    const { service, auditRows } = harness();
    const result = await service.applyAdminEmailChange(
      'admin-1',
      'subject-1',
      'new@example.com'
    );
    expect(result.success).toBe(true);
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.COMMITTED)
    ).toBe(true);
  });

  it('forward Kratos fails → ROLLED_BACK + EMAIL_CHANGE_KRATOS_WRITE_FAILED', async () => {
    const { service, auditRows } = harness({ kratosForwardFails: true });
    await expect(
      service.applyAdminEmailChange('admin-1', 'subject-1', 'new@example.com')
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_KRATOS_WRITE_FAILED,
    });
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.ROLLED_BACK)
    ).toBe(true);
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.COMMITTED)
    ).toBe(false);
  });

  it('forward Kratos succeeds, Alkemio fails, revert ok → ROLLED_BACK', async () => {
    const { service, auditRows } = harness({ alkemioFails: true });
    await expect(
      service.applyAdminEmailChange('admin-1', 'subject-1', 'new@example.com')
    ).rejects.toBeInstanceOf(UserEmailChangeException);
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.ROLLED_BACK)
    ).toBe(true);
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.DRIFT_DETECTED)
    ).toBe(false);
  });

  it('forward Kratos succeeds, Alkemio fails, revert fails → DRIFT_DETECTED', async () => {
    const { service, auditRows } = harness({
      alkemioFails: true,
      kratosRevertFails: true,
    });
    await expect(
      service.applyAdminEmailChange('admin-1', 'subject-1', 'new@example.com')
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_DETECTED,
    });
    expect(
      auditRows.some(r => r.outcome === PlatformAuditOutcome.DRIFT_DETECTED)
    ).toBe(true);
  });

  it('writes a commit_started breadcrumb before the forward Kratos write', async () => {
    const { service, auditRows, repository, kratosService } = harness();
    await service.applyAdminEmailChange(
      'admin-1',
      'subject-1',
      'new@example.com'
    );

    // The breadcrumb is the very first audit row, carrying both addresses.
    expect(auditRows[0].outcome).toBe(PlatformAuditOutcome.COMMIT_STARTED);
    expect(auditRows[0].details).toEqual({
      oldEmail: 'old@example.com',
      newEmail: 'new@example.com',
    });

    // ...and it is persisted BEFORE the forward Kratos identity write, so a
    // process death in the commit window always leaves a durable trail.
    const breadcrumbOrder = (repository.appendEmailChangeEntry as any).mock
      .invocationCallOrder[0];
    const kratosWriteOrder = (kratosService.updateIdentityEmailTrait as any)
      .mock.invocationCallOrder[0];
    expect(breadcrumbOrder).toBeLessThan(kratosWriteOrder);
  });
});
