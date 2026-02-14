import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { DomainPlatformSettingsService } from './domain.platform.settings.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { type Mock, vi } from 'vitest';

describe('DomainPlatformSettingsService', () => {
  let service: DomainPlatformSettingsService;
  let organizationService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DomainPlatformSettingsService, MockWinstonProvider, MockCacheManager],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(DomainPlatformSettingsService);
    organizationService = module.get(OrganizationService) as unknown as Record<string, Mock>;
  });

  describe('updateOrganizationPlatformSettings', () => {
    it('should update nameID and save when nameID differs (case-insensitive)', async () => {
      const organization = { nameID: 'old-name', id: 'org-1' } as any;
      const inputData = { nameID: 'new-name' } as any;

      vi.mocked(organizationService.checkNameIdOrFail).mockResolvedValue(undefined);
      vi.mocked(organizationService.save).mockResolvedValue({ ...organization, nameID: 'new-name' });

      const result = await service.updateOrganizationPlatformSettings(organization, inputData);

      expect(organizationService.checkNameIdOrFail).toHaveBeenCalledWith('new-name');
      expect(organization.nameID).toBe('new-name');
      expect(organizationService.save).toHaveBeenCalledWith(organization);
      expect(result.nameID).toBe('new-name');
    });

    it('should not check nameID validity when nameID is the same (case-insensitive)', async () => {
      const organization = { nameID: 'Same-Name', id: 'org-1' } as any;
      const inputData = { nameID: 'same-name' } as any;

      vi.mocked(organizationService.save).mockResolvedValue(organization);

      await service.updateOrganizationPlatformSettings(organization, inputData);

      expect(organizationService.checkNameIdOrFail).not.toHaveBeenCalled();
      expect(organizationService.save).toHaveBeenCalledWith(organization);
    });

    it('should not check nameID validity when nameID is identical', async () => {
      const organization = { nameID: 'my-org', id: 'org-1' } as any;
      const inputData = { nameID: 'my-org' } as any;

      vi.mocked(organizationService.save).mockResolvedValue(organization);

      await service.updateOrganizationPlatformSettings(organization, inputData);

      expect(organizationService.checkNameIdOrFail).not.toHaveBeenCalled();
    });

    it('should propagate error when checkNameIdOrFail throws', async () => {
      const organization = { nameID: 'old-name', id: 'org-1' } as any;
      const inputData = { nameID: 'taken-name' } as any;

      vi.mocked(organizationService.checkNameIdOrFail).mockRejectedValue(
        new Error('NameID already in use')
      );

      await expect(
        service.updateOrganizationPlatformSettings(organization, inputData)
      ).rejects.toThrow('NameID already in use');

      expect(organizationService.save).not.toHaveBeenCalled();
    });

    it('should detect nameID difference with mixed case', async () => {
      const organization = { nameID: 'ABC', id: 'org-1' } as any;
      const inputData = { nameID: 'XYZ' } as any;

      vi.mocked(organizationService.checkNameIdOrFail).mockResolvedValue(undefined);
      vi.mocked(organizationService.save).mockResolvedValue({ ...organization, nameID: 'XYZ' });

      await service.updateOrganizationPlatformSettings(organization, inputData);

      expect(organizationService.checkNameIdOrFail).toHaveBeenCalledWith('XYZ');
      expect(organization.nameID).toBe('XYZ');
    });
  });
});
