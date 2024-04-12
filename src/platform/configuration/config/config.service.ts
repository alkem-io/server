import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IConfig } from './config.interface';
import { IAuthenticationProviderConfig } from './authentication/providers/authentication.provider.config.interface';
import { ConfigurationTypes } from '@common/enums';
import { IOryConfig } from './authentication/providers/ory/ory.config.interface';
import { PlatformFeatureFlagName } from '@common/enums/platform.feature.flag.name';

@Injectable()
export class KonfigService {
  constructor(private configService: ConfigService) {}

  async getConfig(): Promise<IConfig> {
    const domain = new URL(
      this.configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
    ).hostname;

    const sentryConfig = this.configService.get(
      ConfigurationTypes.MONITORING
    )?.sentry;
    const apmConfig = this.configService.get(
      ConfigurationTypes.MONITORING
    )?.apm;
    const geoConfig = this.configService.get(
      ConfigurationTypes.INTEGRATIONS
    )?.geo;
    return {
      authentication: {
        providers: await this.getAuthenticationProvidersConfig(),
      },
      featureFlags: [
        {
          name: PlatformFeatureFlagName.SSI,
          enabled: this.configService.get(ConfigurationTypes.SSI)?.enabled,
        },
        {
          name: PlatformFeatureFlagName.COMMUNICATIONS,
          enabled: this.configService.get(ConfigurationTypes.COMMUNICATIONS)
            ?.enabled,
        },
        {
          name: PlatformFeatureFlagName.COMMUNICATIONS_DISCUSSIONS,
          enabled: this.configService.get(ConfigurationTypes.COMMUNICATIONS)
            ?.discussions?.enabled,
        },
        {
          name: PlatformFeatureFlagName.SUBSCRIPTIONS,
          enabled: this.configService.get(ConfigurationTypes.HOSTING)
            ?.subscriptions?.enabled,
        },
        {
          name: PlatformFeatureFlagName.NOTIFICATIONS,
          enabled: this.configService.get(ConfigurationTypes.NOTIFICATIONS)
            ?.enabled,
        },
        {
          name: PlatformFeatureFlagName.WHITEBOARDS,
          enabled: this.configService.get(ConfigurationTypes.COLLABORATION)
            ?.whiteboards?.enabled,
        },
        {
          name: PlatformFeatureFlagName.LANDING_PAGE,
          enabled: this.configService.get(ConfigurationTypes.PLATFORM)
            ?.landing_page?.enabled,
        },
        {
          name: PlatformFeatureFlagName.GUIDENCE_ENGINE,
          enabled: this.configService.get(ConfigurationTypes.PLATFORM)
            ?.guidance_engine?.enabled,
        },
      ],
      locations: {
        domain,
        environment: this.configService.get(ConfigurationTypes.HOSTING)
          ?.environment,
        terms: this.configService.get(ConfigurationTypes.PLATFORM)?.terms,
        privacy: this.configService.get(ConfigurationTypes.PLATFORM)?.privacy,
        security: this.configService.get(ConfigurationTypes.PLATFORM)?.security,
        support: this.configService.get(ConfigurationTypes.PLATFORM)?.support,
        feedback: this.configService.get(ConfigurationTypes.PLATFORM)?.feedback,
        forumreleases: this.configService.get(ConfigurationTypes.PLATFORM)
          ?.forumreleases,
        about: this.configService.get(ConfigurationTypes.PLATFORM)?.about,
        landing: this.configService.get(ConfigurationTypes.PLATFORM)?.landing,
        blog: this.configService.get(ConfigurationTypes.PLATFORM)?.blog,
        impact: this.configService.get(ConfigurationTypes.PLATFORM)?.impact,
        inspiration: this.configService.get(ConfigurationTypes.PLATFORM)
          ?.inspiration,
        innovationLibrary: this.configService.get(ConfigurationTypes.PLATFORM)
          ?.innovationLibrary,
        foundation: this.configService.get(ConfigurationTypes.PLATFORM)
          ?.foundation,
        opensource: this.configService.get(ConfigurationTypes.PLATFORM)
          ?.opensource,
        releases: this.configService.get(ConfigurationTypes.PLATFORM)?.releases,
        help: this.configService.get(ConfigurationTypes.PLATFORM)?.help,
        community: this.configService.get(ConfigurationTypes.PLATFORM)
          ?.community,
        newuser: this.configService.get(ConfigurationTypes.PLATFORM)?.newuser,
        tips: this.configService.get(ConfigurationTypes.PLATFORM)?.tips,
        aup: this.configService.get(ConfigurationTypes.PLATFORM)?.aup,
      },
      sentry: {
        enabled: sentryConfig?.enabled,
        endpoint: sentryConfig?.endpoint,
        submitPII: sentryConfig?.submit_pii,
      },
      apm: {
        rumEnabled: apmConfig?.rumEnabled,
        endpoint: apmConfig?.endpoint,
      },
      geo: {
        endpoint: geoConfig?.rest_endpoint,
      },
    };
  }

  async getAuthenticationProvidersConfig(): Promise<
    IAuthenticationProviderConfig[]
  > {
    const authProviders = [
      {
        name: 'Ory Kratos Config',
        label: 'Ory Kratos Config',
        icon: '',
        enabled: true,
        config: await this.getOryConfig(),
      },
    ];

    return authProviders;
  }

  async getOryConfig(): Promise<IOryConfig> {
    const oryConfig = (
      await this.configService.get(ConfigurationTypes.IDENTITY)
    )?.authentication?.providers?.ory;
    const res = {
      kratosPublicBaseURL: oryConfig.kratos_public_base_url,
      issuer: oryConfig.issuer,
    } as IOryConfig;
    return res;
  }
}
