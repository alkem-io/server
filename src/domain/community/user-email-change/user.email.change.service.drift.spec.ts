import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformAuditInitiatorRole } from './enums/platform.audit.initiator.role';
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

function makeServiceWithDrift(opts: {
  driftRow: any;
  alkemioCurrent: string;
  kratosCurrent: string;
  kratosWriteThrows?: boolean;
  alkemioSaveThrows?: boolean;
}) {
  const auditRows: any[] = [];
  const repository = {
    appendEmailChangeEntry: vi.fn(async input => {
      const row = { ...input, rowId: auditRows.length + 100 };
      auditRows.push(row);
      return row;
    }),
    findEmailChangeBySubjectPaged: vi.fn(),
    findLatestEmailChangeBySubject: vi.fn(),
    findLatestUnresolvedDriftBySubject: vi
      .fn()
      .mockResolvedValue(opts.driftRow),
  } as unknown as PlatformAuditEntryRepository;
  const audit = new UserEmailChangeAuditService(repository);

  const kratosService = {
    findIdentityByEmail: vi.fn(),
    getIdentityById: vi.fn().mockResolvedValue({ id: 'kratos-1' }),
    getIdentityEmailTrait: vi.fn(async () => opts.kratosCurrent),
    updateIdentityEmailTrait: vi.fn(async () => {
      if (opts.kratosWriteThrows) throw new Error('kratos down');
      return { id: 'kratos-1' };
    }),
    invalidateAllIdentitySessions: vi.fn(),
  } as unknown as KratosService;

  const userService = {
    getUserByEmail: vi.fn(),
    save: vi.fn(async (u: any) => {
      if (opts.alkemioSaveThrows) throw new Error('typeorm fail');
      return u;
    }),
  } as unknown as UserService;

  const userLookupService = {
    getUserByIdOrFail: vi.fn(async () => ({
      id: 'subject-1',
      authenticationID: 'kratos-1',
      email: opts.alkemioCurrent,
      profile: { displayName: 'Subject' },
    })),
  } as unknown as UserLookupService;

  const notificationAdapter = {
    publishEmailChangeSecuritySignal: vi.fn().mockResolvedValue(undefined),
    publishEmailChangeNewAddressNotification: vi
      .fn()
      .mockResolvedValue(undefined),
    publishEmailChangeGlobalAdminNotification: vi
      .fn()
      .mockResolvedValue(undefined),
  } as unknown as NotificationExternalAdapter;

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

  return {
    service: new UserEmailChangeService(
      repository,
      audit,
      subjectFootprintResolver,
      kratosService,
      notificationAdapter,
      userService,
      userLookupService,
      configService,
      createLogger()
    ),
    auditRows,
    kratosService,
    userService,
  };
}

const baseDrift = (rowId = 50) => ({
  rowId,
  correlationId: 'corr-1',
  outcome: PlatformAuditOutcome.DRIFT_DETECTED,
  initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
  details: { oldEmail: 'old@example.com', newEmail: 'new@example.com' },
});

describe('UserEmailChangeService.resolveDrift', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws EMAIL_CHANGE_DRIFT_NOT_FOUND when there is no outstanding drift', async () => {
    const { service } = makeServiceWithDrift({
      driftRow: null,
      alkemioCurrent: 'old@example.com',
      kratosCurrent: 'new@example.com',
    });
    await expect(
      service.resolveDrift('admin-1', 'subject-1', 'old@example.com')
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_NOT_FOUND,
    });
  });

  it('rejects canonicalEmail that does not match either drift side', async () => {
    const { service } = makeServiceWithDrift({
      driftRow: baseDrift(),
      alkemioCurrent: 'old@example.com',
      kratosCurrent: 'new@example.com',
    });
    await expect(
      service.resolveDrift('admin-1', 'subject-1', 'something-else@example.com')
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_VALIDATION,
    });
  });

  it('aligns Kratos to canonicalEmail when only Kratos diverges and writes DRIFT_RESOLVED', async () => {
    const { service, auditRows, kratosService } = makeServiceWithDrift({
      driftRow: baseDrift(),
      alkemioCurrent: 'old@example.com',
      kratosCurrent: 'new@example.com',
    });
    const result = await service.resolveDrift(
      'admin-1',
      'subject-1',
      'old@example.com'
    );
    expect(result).toEqual({ success: true, email: 'old@example.com' });
    expect(kratosService.updateIdentityEmailTrait).toHaveBeenCalledWith(
      'kratos-1',
      'old@example.com'
    );
    const resolved = auditRows.find(
      r => r.outcome === PlatformAuditOutcome.DRIFT_RESOLVED
    );
    expect(resolved).toBeDefined();
    expect(resolved.correlationId).toBe('corr-1');
    expect(resolved.details.oldEmail).toBe('old@example.com');
    expect(resolved.details.newEmail).toBe('old@example.com');
  });

  it('no-op when both sides already match canonicalEmail', async () => {
    const { service, auditRows, kratosService } = makeServiceWithDrift({
      driftRow: baseDrift(),
      alkemioCurrent: 'old@example.com',
      kratosCurrent: 'old@example.com',
    });
    await service.resolveDrift('admin-1', 'subject-1', 'old@example.com');
    expect(kratosService.updateIdentityEmailTrait).not.toHaveBeenCalled();
    const resolved = auditRows.find(
      r => r.outcome === PlatformAuditOutcome.DRIFT_RESOLVED
    );
    expect(resolved).toBeDefined();
  });

  it('writes DRIFT_RESOLUTION_FAILED when Kratos write exhausts retries', async () => {
    const { service, auditRows } = makeServiceWithDrift({
      driftRow: baseDrift(),
      alkemioCurrent: 'old@example.com',
      kratosCurrent: 'new@example.com',
      kratosWriteThrows: true,
    });
    await expect(
      service.resolveDrift('admin-1', 'subject-1', 'old@example.com')
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED,
    });
    expect(
      auditRows.some(
        r => r.outcome === PlatformAuditOutcome.DRIFT_RESOLUTION_FAILED
      )
    ).toBe(true);
  });
});
