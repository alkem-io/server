import { VirtualContributorPlatformSettingsService } from './virtual.contributor.platform.settings.service';
import { IVirtualContributorPlatformSettings } from './virtual.contributor.platform.settings.interface';
import { UpdateVirtualContributorPlatformSettingsEntityInput } from './dto/virtual.contributor.platform.settings.dto.update';

describe('VirtualContributorPlatformSettingsService', () => {
  let service: VirtualContributorPlatformSettingsService;

  beforeEach(() => {
    service = new VirtualContributorPlatformSettingsService();
  });

  describe('updateSettings', () => {
    it('should set promptGraphEditingEnabled to true when provided as true', () => {
      const settings: IVirtualContributorPlatformSettings = {
        promptGraphEditingEnabled: false,
      } as IVirtualContributorPlatformSettings;

      const updateData: UpdateVirtualContributorPlatformSettingsEntityInput = {
        promptGraphEditingEnabled: true,
      } as UpdateVirtualContributorPlatformSettingsEntityInput;

      const result = service.updateSettings(settings, updateData);

      expect(result.promptGraphEditingEnabled).toBe(true);
    });

    it('should set promptGraphEditingEnabled to false when provided as false', () => {
      const settings: IVirtualContributorPlatformSettings = {
        promptGraphEditingEnabled: true,
      } as IVirtualContributorPlatformSettings;

      const updateData: UpdateVirtualContributorPlatformSettingsEntityInput = {
        promptGraphEditingEnabled: false,
      } as UpdateVirtualContributorPlatformSettingsEntityInput;

      const result = service.updateSettings(settings, updateData);

      expect(result.promptGraphEditingEnabled).toBe(false);
    });

    it('should return the same settings object (mutates in place)', () => {
      const settings: IVirtualContributorPlatformSettings = {
        promptGraphEditingEnabled: false,
      } as IVirtualContributorPlatformSettings;

      const updateData: UpdateVirtualContributorPlatformSettingsEntityInput = {
        promptGraphEditingEnabled: true,
      } as UpdateVirtualContributorPlatformSettingsEntityInput;

      const result = service.updateSettings(settings, updateData);

      expect(result).toBe(settings);
    });
  });
});
