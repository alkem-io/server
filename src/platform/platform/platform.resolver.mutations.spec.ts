import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformSettingsService } from '@platform/platform-settings/platform.settings.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { PlatformResolverMutations } from './platform.resolver.mutations';
import { PlatformService } from './platform.service';
import { PlatformAuthorizationService } from './platform.service.authorization';

describe('PlatformResolverMutations', () => {
  let resolver: PlatformResolverMutations;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let platformService: PlatformService;
  let platformAuthorizationService: PlatformAuthorizationService;
  let platformAuthorizationPolicyService: PlatformAuthorizationPolicyService;
  let platformSettingsService: PlatformSettingsService;

  const mockActorContext = { actorID: 'actor-1' } as ActorContext;

  const mockPlatform = {
    id: 'p1',
    authorization: { id: 'auth-1' },
    settings: {
      integration: {
        iframeAllowedUrls: ['https://existing.com'],
        notificationEmailBlacklist: ['existing@test.com'],
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PlatformResolverMutations);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    platformService = module.get(PlatformService);
    platformAuthorizationService = module.get(PlatformAuthorizationService);
    platformAuthorizationPolicyService = module.get(
      PlatformAuthorizationPolicyService
    );
    platformSettingsService = module.get(PlatformSettingsService);
  });

  describe('authorizationPolicyResetOnPlatform', () => {
    it('should reset authorization policy and return platform', async () => {
      const platformPolicy = { id: 'pp-1' };
      (
        platformAuthorizationPolicyService.getPlatformAuthorizationPolicy as Mock
      ).mockResolvedValue(platformPolicy);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (
        platformAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue([]);
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );

      const result =
        await resolver.authorizationPolicyResetOnPlatform(mockActorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(result).toBe(mockPlatform);
    });
  });

  describe('updatePlatformSettings', () => {
    it('should update settings with proper authorization', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedSettings = { integration: { someKey: 'value' } };
      (platformSettingsService.updateSettings as Mock).mockResolvedValue(
        updatedSettings
      );
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const settingsData = { integration: { someKey: 'value' } } as any;

      const result = await resolver.updatePlatformSettings(
        mockActorContext,
        settingsData
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockPlatform.authorization,
        AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
        expect.any(String)
      );
      expect(result).toBe(updatedSettings);
    });
  });

  describe('addIframeAllowedURL', () => {
    it('should add URL and save platform', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedUrls = ['https://existing.com', 'https://new.com'];
      (
        platformSettingsService.addIframeAllowedURLOrFail as Mock
      ).mockReturnValue(updatedUrls);
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const result = await resolver.addIframeAllowedURL(
        mockActorContext,
        'https://new.com'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockPlatform.authorization,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(result).toEqual(updatedUrls);
    });
  });

  describe('removeIframeAllowedURL', () => {
    it('should remove URL and save platform', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedUrls: string[] = [];
      (
        platformSettingsService.removeIframeAllowedURLOrFail as Mock
      ).mockReturnValue(updatedUrls);
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const result = await resolver.removeIframeAllowedURL(
        mockActorContext,
        'https://existing.com'
      );

      expect(result).toEqual([]);
    });
  });

  describe('addNotificationEmailToBlacklist', () => {
    it('should add email and save platform', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedList = ['existing@test.com', 'new@test.com'];
      (
        platformSettingsService.addNotificationEmailToBlacklistOrFail as Mock
      ).mockReturnValue(updatedList);
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const result = await resolver.addNotificationEmailToBlacklist(
        mockActorContext,
        { email: 'new@test.com' } as any
      );

      expect(result).toEqual(updatedList);
    });
  });

  describe('removeNotificationEmailFromBlacklist', () => {
    it('should remove email and save platform', async () => {
      (platformService.getPlatformOrFail as Mock).mockResolvedValue(
        mockPlatform
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      const updatedList: string[] = [];
      (
        platformSettingsService.removeNotificationEmailFromBlacklistOrFail as Mock
      ).mockReturnValue(updatedList);
      (platformService.savePlatform as Mock).mockResolvedValue(mockPlatform);

      const result = await resolver.removeNotificationEmailFromBlacklist(
        mockActorContext,
        { email: 'existing@test.com' } as any
      );

      expect(result).toEqual([]);
    });
  });
});
