import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformUserRecordAuditService } from './platform.user.record.audit.service';

/**
 * 027-platform-role-redesign (T022/T070d) — `platform_user_record`
 * (A4/A5): fail-open, like every category except `platform_role_assignment`.
 */
describe('PlatformUserRecordAuditService', () => {
  let repository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let logger: { error: ReturnType<typeof vi.fn> };
  let service: PlatformUserRecordAuditService;

  beforeEach(() => {
    repository = {
      create: vi.fn(entry => entry),
      save: vi.fn().mockResolvedValue(undefined),
    };
    logger = { error: vi.fn() };
    service = new PlatformUserRecordAuditService(
      repository as any,
      logger as any
    );
  });

  it('write succeeds: records the real targeted user as subject (FR-030, SC-015)', async () => {
    await service.recordAction({
      initiatorUserId: 'admin-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_USERS_ADMIN,
      targetUserId: 'user-target-1',
      action: 'deleteUser',
      outcome: 'identity_deleted',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ subjectUserId: 'user-target-1' })
    );
    expect(repository.save).toHaveBeenCalledOnce();
  });

  it('write fails: fail-OPEN — logs and resolves without throwing', async () => {
    repository.save.mockRejectedValue(new Error('DB down'));

    await expect(
      service.recordAction({
        initiatorUserId: 'admin-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_USERS_ADMIN,
        targetUserId: 'user-target-1',
        action: 'adminUserAccountDelete',
        outcome: 'account_reset',
      })
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  describe('recordActionForActor (T063 convenience wrapper)', () => {
    it('resolves attribution and writes via recordAction', async () => {
      await service.recordActionForActor(
        {
          actorID: 'admin-1',
          credentials: [{ type: 'platform-users-admin', resourceID: '' }],
        } as any,
        ['platform-users-admin' as any],
        [],
        {
          targetUserId: 'user-target-1',
          action: 'deleteUser',
          outcome: 'identity_deleted',
        }
      );

      expect(repository.save).toHaveBeenCalledOnce();
    });

    it('fails open when attribution cannot be resolved (a real defect) — no write, no throw', async () => {
      await service.recordActionForActor(
        {
          actorID: 'user-3',
          credentials: [{ type: 'space-member', resourceID: '' }],
        } as any,
        ['platform-users-admin' as any],
        [],
        {
          targetUserId: 'user-target-1',
          action: 'deleteUser',
          outcome: 'identity_deleted',
        }
      );

      expect(repository.save).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
