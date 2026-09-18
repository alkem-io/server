import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformConfigurationAuditService } from './platform.configuration.audit.service';

/**
 * 027-platform-role-redesign (T023/T070d) — `platform_configuration`
 * (A10/A13): fail-open, no subject (platform-wide by nature).
 */
describe('PlatformConfigurationAuditService', () => {
  let repository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let logger: { error: ReturnType<typeof vi.fn> };
  let service: PlatformConfigurationAuditService;

  beforeEach(() => {
    repository = {
      create: vi.fn(entry => entry),
      save: vi.fn().mockResolvedValue(undefined),
    };
    logger = { error: vi.fn() };
    service = new PlatformConfigurationAuditService(
      repository as any,
      logger as any
    );
  });

  it('write succeeds: records the configuration change', async () => {
    await service.recordChange({
      initiatorUserId: 'admin-1',
      initiatorRole: PlatformAuditInitiatorRole.PLATFORM_SETTINGS_ADMIN,
      setting: 'iframeAllowedUrls',
      newValue: 'https://example.com',
      outcome: 'success',
    });

    expect(repository.save).toHaveBeenCalledOnce();
  });

  it('write fails: fail-OPEN — logs and resolves without throwing', async () => {
    repository.save.mockRejectedValue(new Error('DB down'));

    await expect(
      service.recordChange({
        initiatorUserId: 'admin-1',
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_SETTINGS_ADMIN,
        setting: 'iframeAllowedUrls',
        outcome: 'success',
      })
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it('recordChangeForActor resolves attribution and writes via recordChange', async () => {
    await service.recordChangeForActor(
      {
        actorID: 'admin-1',
        credentials: [{ type: 'platform-settings-admin', resourceID: '' }],
      } as any,
      ['platform-settings-admin' as any],
      [],
      { setting: 'platformSettings', outcome: 'success' }
    );

    expect(repository.save).toHaveBeenCalledOnce();
  });
});
