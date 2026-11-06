import { A22_INTENDED_OWNERS } from '@common/constants/authorization/audit.intended.owners';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformResourceAuditService } from './platform.resource.audit.service';

/**
 * 027-platform-role-redesign (T024/T070d) — `platform_resource`
 * (A8/A9/A12/A14): fail-open.
 */
describe('PlatformResourceAuditService', () => {
  let repository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let logger: { error: ReturnType<typeof vi.fn> };
  let service: PlatformResourceAuditService;

  beforeEach(() => {
    repository = {
      create: vi.fn(entry => entry),
      save: vi.fn().mockResolvedValue(undefined),
    };
    logger = { error: vi.fn() };
    service = new PlatformResourceAuditService(
      repository as any,
      logger as any
    );
  });

  it('write succeeds: records the resource event', async () => {
    await service.recordEvent({
      initiatorUserId: 'admin-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_RESOURCE_ADMIN,
      resourceKind: 'space',
      resourceId: 'space-1',
      outcome: 'moved',
    });

    expect(repository.save).toHaveBeenCalledOnce();
  });

  it('write fails: fail-OPEN — logs and resolves without throwing', async () => {
    repository.save.mockRejectedValue(new Error('DB down'));

    await expect(
      service.recordEvent({
        initiatorUserId: 'admin-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_CONTENT_FULL_ACCESS,
        resourceKind: 'callout',
        resourceId: 'callout-1',
        outcome: 'deleted',
      })
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it('recordEventForActor resolves attribution and writes via recordEvent', async () => {
    await service.recordEventForActor(
      {
        actorID: 'admin-1',
        credentials: [{ type: 'platform-content-full-access', resourceID: '' }],
      } as any,
      ['platform-content-full-access' as any],
      { resourceKind: 'callout', resourceId: 'callout-1', outcome: 'deleted' }
    );

    expect(repository.save).toHaveBeenCalledOnce();
  });

  it('recordEventForActor fails open when attribution cannot be resolved', async () => {
    await service.recordEventForActor(
      {
        actorID: 'user-x',
        credentials: [{ type: 'space-member', resourceID: '' }],
      } as any,
      ['platform-content-full-access' as any],
      { resourceKind: 'callout', resourceId: 'callout-1', outcome: 'deleted' }
    );

    expect(repository.save).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  describe('promote_changed', () => {
    it('records the platform_resource category with the existing configuration_changed outcome and the stored flag in details', async () => {
      await service.recordEvent({
        initiatorUserId: 'content-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_CONTENT_FULL_ACCESS,
        resourceKind: 'space',
        resourceId: 'space-1',
        promote: true,
        outcome: 'promote_changed',
      });

      expect(repository.save).toHaveBeenCalledOnce();
      const saved = repository.save.mock.calls[0][0];
      expect(saved.category).toBe(PlatformAuditCategory.PLATFORM_RESOURCE);
      expect(saved.outcome).toBe(PlatformAuditOutcome.CONFIGURATION_CHANGED);
      expect(saved.details).toMatchObject({
        resourceKind: 'space',
        resourceId: 'space-1',
        promote: true,
      });
    });

    it('keeps an explicit false in details (un-promote is recorded as such)', async () => {
      await service.recordEvent({
        initiatorUserId: 'content-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_CONTENT_FULL_ACCESS,
        resourceKind: 'innovation_pack',
        resourceId: 'pack-1',
        promote: false,
        outcome: 'promote_changed',
      });

      expect(repository.save.mock.calls[0][0].details.promote).toBe(false);
    });

    it('attributes a License Manager against the promote owners', async () => {
      await service.recordEventForActor(
        {
          actorID: 'lm-1',
          credentials: [
            {
              type: AuthorizationCredential.PLATFORM_LICENSE_MANAGER,
              resourceID: '',
            },
          ],
        } as any,
        A22_INTENDED_OWNERS,
        {
          resourceKind: 'virtual_contributor',
          resourceId: 'vc-1',
          promote: true,
          outcome: 'promote_changed',
        }
      );

      expect(repository.save).toHaveBeenCalledOnce();
      const saved = repository.save.mock.calls[0][0];
      expect(saved.initiatorUserId).toBe('lm-1');
      expect(saved.initiatorRole).toBe(
        PlatformAuditInitiatorRole.PLATFORM_LICENSE_MANAGER
      );
    });

    it('fails open: a repository failure is logged and swallowed', async () => {
      repository.save.mockRejectedValue(new Error('DB down'));

      await expect(
        service.recordEvent({
          initiatorUserId: 'content-1',
          initiatorRole:
            PlatformAuditInitiatorRole.PLATFORM_CONTENT_FULL_ACCESS,
          resourceKind: 'space',
          resourceId: 'space-1',
          promote: true,
          outcome: 'promote_changed',
        })
      ).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
