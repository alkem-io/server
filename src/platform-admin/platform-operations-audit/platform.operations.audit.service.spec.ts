import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { PlatformOperationsAuditService } from './platform.operations.audit.service';

describe('PlatformOperationsAuditService', () => {
  let service: PlatformOperationsAuditService;
  let repo: { create: Mock; save: Mock };

  beforeEach(async () => {
    repo = {
      create: vi.fn(entry => entry),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformOperationsAuditService,
        MockWinstonProvider,
        { provide: getRepositoryToken(PlatformAuditEntry), useValue: repo },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformOperationsAuditService);
  });

  // 027-platform-role-redesign (T025/D11): the actor-in-both-columns
  // placeholder is RETIRED — a platform-wide operation now writes a NULL
  // subject, never the actor. This is a behavioural change to already-
  // delivered 032 code, a hard prerequisite for SC-015's derived
  // self-affecting predicate (initiatorUserId = subjectUserId) to be sound.
  it('writes the actor as initiator and NULL subject for a platform-wide operation (no targetUserId)', async () => {
    await service.recordOperation({
      actorID: 'actor-1',
      action: 'adminUpdateGeoLocationData',
      outcome: 'success',
    });

    expect(repo.create).toHaveBeenCalledWith({
      category: PlatformAuditCategory.PLATFORM_OPERATIONS,
      subjectUserId: undefined,
      initiatorUserId: 'actor-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome: PlatformAuditOutcome.OPERATION_SUCCEEDED,
      details: { action: 'adminUpdateGeoLocationData' },
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('writes the REAL targeted user as subject for a per-user operation', async () => {
    await service.recordOperation({
      actorID: 'actor-1',
      targetUserId: 'target-user-9',
      action: 'adminMigrateUserAvatar',
      outcome: 'success',
    });

    const entry = repo.create.mock.calls[0][0];
    expect(entry.subjectUserId).toBe('target-user-9');
    expect(entry.initiatorUserId).toBe('actor-1');
  });

  it('SC-015: a self-targeted per-user operation is derivable as self-affecting (initiatorUserId = subjectUserId)', async () => {
    await service.recordOperation({
      actorID: 'actor-1',
      targetUserId: 'actor-1',
      action: 'adminMigrateUserAvatar',
      outcome: 'success',
    });

    const entry = repo.create.mock.calls[0][0];
    expect(entry.initiatorUserId).toBe(entry.subjectUserId);
  });

  it('maps a failure outcome to OPERATION_FAILED', async () => {
    await service.recordOperation({
      actorID: 'actor-1',
      action: 'authorizationPolicyResetAll',
      outcome: 'failure',
    });

    const entry = repo.create.mock.calls[0][0];
    expect(entry.outcome).toBe(PlatformAuditOutcome.OPERATION_FAILED);
  });

  it('persists allowlisted target fields in details', async () => {
    await service.recordOperation({
      actorID: 'actor-1',
      action: 'adminCommunicationRemoveOrphanedRoom',
      outcome: 'success',
      target: { roomID: 'room-42' },
    });

    const entry = repo.create.mock.calls[0][0];
    expect(entry.details).toEqual({
      action: 'adminCommunicationRemoveOrphanedRoom',
      target: { roomID: 'room-42' },
    });
  });

  it('serializes the error into details on failure rows, truncated', async () => {
    await service.recordOperation({
      actorID: 'actor-1',
      action: 'resetLicenseOnAccounts',
      outcome: 'failure',
      error: new Error('x'.repeat(600)),
    });

    const entry = repo.create.mock.calls[0][0];
    expect(entry.details.error).toMatch(/^Error: x+$/);
    expect(entry.details.error.length).toBe(500);
  });

  it('never writes an error key on success rows', async () => {
    await service.recordOperation({
      actorID: 'actor-1',
      action: 'cleanupCollections',
      outcome: 'success',
      error: new Error('should be ignored'),
    });

    const entry = repo.create.mock.calls[0][0];
    expect(entry.details).toEqual({ action: 'cleanupCollections' });
  });

  it('is fail-open: a repository error is swallowed, never thrown into the mutation path', async () => {
    repo.save.mockRejectedValue(new Error('db down'));

    await expect(
      service.recordOperation({
        actorID: 'actor-1',
        action: 'adminInAppNotificationsPrune',
        outcome: 'success',
      })
    ).resolves.toBeUndefined();
  });
});
