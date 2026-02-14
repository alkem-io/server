import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IVirtualContributorSettings } from './virtual.contributor.settings.interface';
import { UpdateVirtualContributorSettingsEntityInput } from './dto/virtual.contributor.settings.dto.update';
import { VirtualContributorSettingsService } from './virtual.contributor.settings.service';

describe('VirtualContributorSettingsService', () => {
  let service: VirtualContributorSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorSettingsService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VirtualContributorSettingsService);
  });

  const buildSettings = (
    overrides: Partial<IVirtualContributorSettings> = {}
  ): IVirtualContributorSettings => {
    return {
      privacy: { knowledgeBaseContentVisible: false },
      ...overrides,
    } as IVirtualContributorSettings;
  };

  describe('updateSettings', () => {
    it('should update knowledgeBaseContentVisible to true when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateVirtualContributorSettingsEntityInput = {
        privacy: { knowledgeBaseContentVisible: true },
      } as UpdateVirtualContributorSettingsEntityInput;

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.knowledgeBaseContentVisible).toBe(true);
    });

    it('should update knowledgeBaseContentVisible to false when provided', () => {
      const settings = buildSettings({
        privacy: { knowledgeBaseContentVisible: true },
      } as any);
      const updateData: UpdateVirtualContributorSettingsEntityInput = {
        privacy: { knowledgeBaseContentVisible: false },
      } as UpdateVirtualContributorSettingsEntityInput;

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.knowledgeBaseContentVisible).toBe(false);
    });

    it('should not change privacy when privacy update data is not provided', () => {
      const settings = buildSettings({
        privacy: { knowledgeBaseContentVisible: true },
      } as any);
      const updateData: UpdateVirtualContributorSettingsEntityInput = {};

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.knowledgeBaseContentVisible).toBe(true);
    });

    it('should leave settings unchanged when update data has empty privacy object', () => {
      const settings = buildSettings({
        privacy: { knowledgeBaseContentVisible: true },
      } as any);
      const updateData: UpdateVirtualContributorSettingsEntityInput = {
        privacy: {},
      } as UpdateVirtualContributorSettingsEntityInput;

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.knowledgeBaseContentVisible).toBe(true);
    });

    it('should return a new settings object (does not mutate in place)', () => {
      const settings = buildSettings();
      const updateData: UpdateVirtualContributorSettingsEntityInput = {
        privacy: { knowledgeBaseContentVisible: true },
      } as UpdateVirtualContributorSettingsEntityInput;

      const result = service.updateSettings(settings, updateData);

      expect(result).not.toBe(settings);
      expect(result.privacy).not.toBe(settings.privacy);
    });

    it('should preserve the original settings object unchanged', () => {
      const settings = buildSettings();
      const updateData: UpdateVirtualContributorSettingsEntityInput = {
        privacy: { knowledgeBaseContentVisible: true },
      } as UpdateVirtualContributorSettingsEntityInput;

      service.updateSettings(settings, updateData);

      expect(settings.privacy.knowledgeBaseContentVisible).toBe(false);
    });
  });
});
