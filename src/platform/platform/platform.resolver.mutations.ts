import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import {
  NotificationEmailAddressInput,
  UpdatePlatformSettingsInput,
} from '@platform/platform-settings';
import { IPlatformSettings } from '@platform/platform-settings/platform.settings.interface';
import { PlatformSettingsService } from '@platform/platform-settings/platform.settings.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';
import { PlatformAuthorizationService } from './platform.service.authorization';

/** T058 — A10's declared owner/legacy-reachers (T045's grant, `platform.service.authorization.ts`). */
const A10_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
];
const A10_LEGACY_REACHERS: readonly AuthorizationCredential[] = [];

@InstrumentResolver()
@Resolver()
export class PlatformResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformService: PlatformService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private platformSettingsService: PlatformSettingsService,
    private platformOperationsAuditService: PlatformOperationsAuditService,
    private readonly platformConfigurationAuditService: PlatformConfigurationAuditService
  ) {}

  @Mutation(() => IPlatform, {
    description: 'Reset the Authorization Policy on the specified Platform.',
  })
  @Profiling.api
  async authorizationPolicyResetOnPlatform(
    @CurrentActor() actorContext: ActorContext
  ): Promise<IPlatform> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization on platform`
    );
    try {
      const updatedAuthorizations =
        await this.platformAuthorizationService.applyAuthorizationPolicy();
      await this.authorizationPolicyService.saveAll(updatedAuthorizations);
      const result = await this.platformService.getPlatformOrFail();
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetOnPlatform',
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetOnPlatform',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  @Mutation(() => IPlatformSettings, {
    description: 'Updates one of the Setting on the Platform',
  })
  async updatePlatformSettings(
    @CurrentActor() actorContext: ActorContext,
    @Args('settingsData') settingsData: UpdatePlatformSettingsInput
  ): Promise<IPlatformSettings> {
    const platform = await this.platformService.getPlatformOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platform.authorization,
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN,
      `platform settings update: ${JSON.stringify(settingsData.integration)}`
    );

    platform.settings = await this.platformSettingsService.updateSettings(
      platform.settings,
      settingsData
    );
    await this.platformService.savePlatform(platform);

    // T058 — A10, single-path surface: every successful call is, by
    // construction, authorized by PLATFORM_SETTINGS_ADMIN.
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A10_INTENDED_OWNERS,
      A10_LEGACY_REACHERS,
      {
        setting: 'platformSettings',
        newValue: settingsData.integration,
        outcome: 'success',
      }
    );

    return platform.settings;
  }

  @Mutation(() => [String], {
    description: 'Adds an Iframe Allowed URL to the Platform Settings',
  })
  async addIframeAllowedURL(
    @CurrentActor() actorContext: ActorContext,
    @Args('whitelistedURL') whitelistedURL: string
  ): Promise<string[]> {
    const platform = await this.platformService.getPlatformOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platform.authorization,
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN, // 027-platform-role-redesign T045: A10, re-anchored off PLATFORM_ADMIN
      `add iframe URL: ${whitelistedURL}`
    );

    platform.settings.integration.iframeAllowedUrls =
      this.platformSettingsService.addIframeAllowedURLOrFail(
        platform.settings,
        whitelistedURL
      );
    await this.platformService.savePlatform(platform);

    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A10_INTENDED_OWNERS,
      A10_LEGACY_REACHERS,
      {
        setting: 'iframeAllowedUrls',
        newValue: whitelistedURL,
        outcome: 'success',
      }
    );

    return platform.settings.integration.iframeAllowedUrls;
  }

  @Mutation(() => [String], {
    description: 'Removes an Iframe Allowed URL from the Platform Settings',
  })
  async removeIframeAllowedURL(
    @CurrentActor() actorContext: ActorContext,
    @Args('whitelistedURL') whitelistedURL: string
  ): Promise<string[]> {
    const platform = await this.platformService.getPlatformOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platform.authorization,
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN, // 027-platform-role-redesign T045: A10, re-anchored off PLATFORM_ADMIN
      `remove iframe URL: ${whitelistedURL}`
    );

    platform.settings.integration.iframeAllowedUrls =
      this.platformSettingsService.removeIframeAllowedURLOrFail(
        platform.settings,
        whitelistedURL
      );
    await this.platformService.savePlatform(platform);

    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A10_INTENDED_OWNERS,
      A10_LEGACY_REACHERS,
      {
        setting: 'iframeAllowedUrls',
        previousValue: whitelistedURL,
        outcome: 'success',
      }
    );

    return platform.settings.integration.iframeAllowedUrls;
  }

  @Mutation(() => [String], {
    description:
      'Adds a full email address to the platform notification blacklist',
  })
  async addNotificationEmailToBlacklist(
    @CurrentActor() actorContext: ActorContext,
    @Args('input') input: NotificationEmailAddressInput
  ): Promise<string[]> {
    const platform = await this.platformService.getPlatformOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platform.authorization,
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN, // 027-platform-role-redesign T045: A10, re-anchored off PLATFORM_ADMIN
      `add notification email to blacklist: ${input.email}`
    );

    platform.settings.integration.notificationEmailBlacklist =
      this.platformSettingsService.addNotificationEmailToBlacklistOrFail(
        platform.settings,
        input.email
      );
    await this.platformService.savePlatform(platform);

    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A10_INTENDED_OWNERS,
      A10_LEGACY_REACHERS,
      {
        setting: 'notificationEmailBlacklist',
        newValue: input.email,
        outcome: 'success',
      }
    );

    return platform.settings.integration.notificationEmailBlacklist;
  }

  @Mutation(() => [String], {
    description:
      'Removes an email address from the platform notification blacklist',
  })
  async removeNotificationEmailFromBlacklist(
    @CurrentActor() actorContext: ActorContext,
    @Args('input') input: NotificationEmailAddressInput
  ): Promise<string[]> {
    const platform = await this.platformService.getPlatformOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platform.authorization,
      AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN, // 027-platform-role-redesign T045: A10, re-anchored off PLATFORM_ADMIN
      `remove notification email from blacklist: ${input.email}`
    );

    platform.settings.integration.notificationEmailBlacklist =
      this.platformSettingsService.removeNotificationEmailFromBlacklistOrFail(
        platform.settings,
        input.email
      );
    await this.platformService.savePlatform(platform);

    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A10_INTENDED_OWNERS,
      A10_LEGACY_REACHERS,
      {
        setting: 'notificationEmailBlacklist',
        previousValue: input.email,
        outcome: 'success',
      }
    );

    return platform.settings.integration.notificationEmailBlacklist;
  }
}
