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

  it('writes actor as both initiator and subject with the fixed admin-tier role', async () => {
    await service.recordOperation({
      actorID: 'actor-1',
      action: 'adminUpdateGeoLocationData',
      outcome: 'success',
    });

    expect(repo.create).toHaveBeenCalledWith({
      category: PlatformAuditCategory.PLATFORM_OPERATIONS,
      subjectUserId: 'actor-1',
      initiatorUserId: 'actor-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      outcome: PlatformAuditOutcome.OPERATION_SUCCEEDED,
      details: { action: 'adminUpdateGeoLocationData' },
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
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
