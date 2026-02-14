import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IOrganizationSettings } from './organization.settings.interface';
import { UpdateOrganizationSettingsEntityInput } from './dto/organization.settings.dto.update';
import { OrganizationSettingsService } from './organization.settings.service';

describe('OrganizationSettingsService', () => {
  let service: OrganizationSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationSettingsService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(OrganizationSettingsService);
  });

  const buildSettings = (
    overrides: Partial<IOrganizationSettings> = {}
  ): IOrganizationSettings => {
    return {
      privacy: { contributionRolesPubliclyVisible: false },
      membership: { allowUsersMatchingDomainToJoin: false },
      ...overrides,
    } as IOrganizationSettings;
  };

  describe('updateSettings', () => {
    it('should update privacy.contributionRolesPubliclyVisible when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        privacy: { contributionRolesPubliclyVisible: true },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(true);
    });

    it('should update membership.allowUsersMatchingDomainToJoin when provided', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        membership: { allowUsersMatchingDomainToJoin: true },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(true);
    });

    it('should not change privacy when privacy update data is not provided', () => {
      const settings = buildSettings({
        privacy: { contributionRolesPubliclyVisible: true },
      } as any);
      const updateData: UpdateOrganizationSettingsEntityInput = {
        membership: { allowUsersMatchingDomainToJoin: true },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(true);
    });

    it('should not change membership when membership update data is not provided', () => {
      const settings = buildSettings({
        membership: { allowUsersMatchingDomainToJoin: true },
      } as any);
      const updateData: UpdateOrganizationSettingsEntityInput = {
        privacy: { contributionRolesPubliclyVisible: false },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(true);
    });

    it('should update both privacy and membership when both are provided', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        privacy: { contributionRolesPubliclyVisible: true },
        membership: { allowUsersMatchingDomainToJoin: true },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(true);
      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(true);
    });

    it('should leave settings unchanged when update data is empty', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {};

      const result = service.updateSettings(settings, updateData);

      expect(result.privacy.contributionRolesPubliclyVisible).toBe(false);
      expect(result.membership.allowUsersMatchingDomainToJoin).toBe(false);
    });

    it('should return the same settings object (mutates in place)', () => {
      const settings = buildSettings();
      const updateData: UpdateOrganizationSettingsEntityInput = {
        privacy: { contributionRolesPubliclyVisible: true },
      };

      const result = service.updateSettings(settings, updateData);

      expect(result).toBe(settings);
    });
  });
});
