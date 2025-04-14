import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IPlatform } from './platform.interface';
import { PlatformAuthorizationService } from './platform.service.authorization';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformService } from './platform.service';
import { IPlatformSettings } from '@platform/platform-settings/platform.settings.interface';
import { UpdatePlatformSettingsInput } from '@platform/platform-settings';
import { PlatformSettingsService } from '@platform/platform-settings/platform.settings.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class PlatformResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformService: PlatformService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private platformSettingsService: PlatformSettingsService
  ) {}

  @Mutation(() => IPlatform, {
    description: 'Reset the Authorization Policy on the specified Platform.',
  })
  @Profiling.api
  async authorizationPolicyResetOnPlatform(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IPlatform> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN, // TODO: back to authorization reset
      `reset authorization on platform: ${agentInfo.email}`
    );
    const updatedAuthorizations =
      await this.platformAuthorizationService.applyAuthorizationPolicy();
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return await this.platformService.getPlatformOrFail();
  }

  @Mutation(() => IPlatformSettings, {
    description: 'Updates one of the Setting on the Platform',
  })
  async updatePlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData') settingsData: UpdatePlatformSettingsInput
  ): Promise<IPlatformSettings> {
    const platform = await this.platformService.getPlatformOrFail();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platform.authorization,
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
      `platform settings update: ${JSON.stringify(settingsData.integration)}`
    );

    platform.settings = await this.platformSettingsService.updateSettings(
      platform.settings,
      settingsData
    );
    await this.platformService.savePlatform(platform);

    return platform.settings;
  }

  @Mutation(() => [String], {
    description: 'Adds an Iframe Allowed URL to the Platform Settings',
  })
  async addIframeAllowedURL(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('iframeAllowedURL') iframeAllowedURL: string
  ): Promise<string[]> {
    const platform = await this.platformService.getPlatformOrFail();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platform.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `add iframe URL: ${iframeAllowedURL}`
    );

    platform.settings.integration.iframeAllowedUrls =
      this.platformSettingsService.addIframeAllowedURL(
        platform.settings,
        iframeAllowedURL
      );
    await this.platformService.savePlatform(platform);

    return platform.settings.integration.iframeAllowedUrls;
  }

  @Mutation(() => [String], {
    description: 'Removes an Iframe Allowed URL from the Platform Settings',
  })
  async removeIframeAllowedURL(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('iframeAllowedURL') iframeAllowedURL: string
  ): Promise<string[]> {
    const platform = await this.platformService.getPlatformOrFail();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platform.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `remove iframe URL: ${iframeAllowedURL}`
    );

    platform.settings.integration.iframeAllowedUrls =
      this.platformSettingsService.removeIframeAllowedURL(
        platform.settings,
        iframeAllowedURL
      );
    await this.platformService.savePlatform(platform);

    return platform.settings.integration.iframeAllowedUrls;
  }
}
