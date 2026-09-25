import { PlatformRoleAssignmentAuditException } from '@common/exceptions/platform.role.assignment.audit.exception';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformRoleAssignmentAuditService } from './platform.role.assignment.audit.service';

/**
 * 027-platform-role-redesign (T021/T070d) — `platform_role_assignment` is
 * the ONE category with a fail-mode that depends on the CALL, not the
 * category: fail-CLOSED for an operator-initiated write, fail-OPEN for a
 * bootstrap-seeded one (FR-027).
 */
describe('PlatformRoleAssignmentAuditService', () => {
  let repository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let logger: { error: ReturnType<typeof vi.fn> };
  let service: PlatformRoleAssignmentAuditService;

  beforeEach(() => {
    repository = {
      create: vi.fn(entry => entry),
      save: vi.fn().mockResolvedValue(undefined),
    };
    logger = { error: vi.fn() };
    service = new PlatformRoleAssignmentAuditService(
      repository as any,
      logger as any
    );
  });

  it('write succeeds: an operator-initiated grant is recorded', async () => {
    await service.recordGrantOrRevoke({
      initiatorUserId: 'admin-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ROLES_ADMIN,
      targetKind: 'user',
      targetId: 'user-1',
      role: 'platform-support',
      outcome: 'granted',
    });

    expect(repository.save).toHaveBeenCalledOnce();
  });

  it('write fails, operator-initiated (fail-CLOSED): throws so the caller aborts the grant', async () => {
    repository.save.mockRejectedValue(new Error('DB down'));

    await expect(
      service.recordGrantOrRevoke({
        initiatorUserId: 'admin-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ROLES_ADMIN,
        targetKind: 'user',
        targetId: 'user-1',
        role: 'platform-support',
        outcome: 'granted',
      })
    ).rejects.toThrow(PlatformRoleAssignmentAuditException);
  });

  it('write fails, bootstrap-seeded (fail-OPEN): logs and resolves, the grant still lands', async () => {
    repository.save.mockRejectedValue(new Error('DB down'));

    await expect(
      service.recordGrantOrRevoke({
        initiatorRole: PlatformAuditInitiatorRole.SYSTEM,
        targetKind: 'user',
        targetId: 'user-1',
        role: 'platform-spaces-reader',
        outcome: 'granted',
        seeded: true,
      })
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it('records an FR-025 attribution fallback: a legacy-broad-credential operator writes as platform_admin', async () => {
    await service.recordGrantOrRevoke({
      initiatorUserId: 'legacy-admin-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      targetKind: 'user',
      targetId: 'user-1',
      role: 'platform-support',
      outcome: 'granted',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
      })
    );
  });

  it('records a role-grant rejection with the violated rule named', async () => {
    await service.recordGrantRejected({
      initiatorUserId: 'user-2',
      initiatorRole: PlatformAuditInitiatorRole.SELF,
      targetKind: 'user',
      targetId: 'user-2',
      role: 'platform-roles-admin',
      rejectedRule: 'assigner-capability',
    });

    expect(repository.save).toHaveBeenCalledOnce();
  });

  // qual-server-9 fix: the subject-column discriminator (`subjectUserId` XOR
  // `subjectOrganizationId`) is the ONE table change this feature spends a
  // migration on (T026) — and had NO assertion anywhere in the repo. A swap
  // of the two ternaries in `write()` would silently misfile every
  // organization-target grant under `subjectUserId` and every test in this
  // file would still pass.
  describe('subject-column discriminator (T026)', () => {
    it('writes subjectUserId (and leaves subjectOrganizationId unset) for a user-target grant', async () => {
      await service.recordGrantOrRevoke({
        initiatorUserId: 'admin-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ROLES_ADMIN,
        targetKind: 'user',
        targetId: 'user-1',
        role: 'platform-support',
        outcome: 'granted',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectUserId: 'user-1',
          subjectOrganizationId: undefined,
        })
      );
    });

    it('writes subjectOrganizationId (and leaves subjectUserId unset) for an organization-target grant', async () => {
      await service.recordGrantOrRevoke({
        initiatorUserId: 'admin-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_USERS_ADMIN,
        targetKind: 'organization',
        targetId: 'org-1',
        role: 'feature-organization-creator',
        outcome: 'granted',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectUserId: undefined,
          subjectOrganizationId: 'org-1',
        })
      );
    });
  });

  // qual-server-9 fix: outcome mapping had no assertion beyond
  // `save` having been called at all — a swap of ROLE_GRANTED/ROLE_REVOKED
  // would pass every existing test.
  it('maps outcome: "revoked" to PlatformAuditOutcome.ROLE_REVOKED', async () => {
    await service.recordGrantOrRevoke({
      initiatorUserId: 'admin-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ROLES_ADMIN,
      targetKind: 'user',
      targetId: 'user-1',
      role: 'platform-support',
      outcome: 'revoked',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: PlatformAuditOutcome.ROLE_REVOKED })
    );
  });
});
