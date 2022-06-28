import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITemplate } from './template/template.interface';
import * as uxTemplate from '@templates/ux-template.json';
import { IConfig } from './config.interface';
import { IAuthenticationProviderConfig } from './authentication/providers/authentication.provider.config.interface';
import { ConfigurationTypes } from '@common/enums';
import { IOryConfig } from './authentication/providers/ory/ory.config.interface';

@Injectable()
export class KonfigService {
  constructor(private configService: ConfigService) {}

  async getConfig(): Promise<IConfig> {
    const sentryConfig = this.configService.get(
      ConfigurationTypes.MONITORING
    )?.sentry;
    return {
      template: await this.getTemplate(),
      authentication: {
        providers: await this.getAuthenticationProvidersConfig(),
      },
      platform: {
        terms: this.configService.get(ConfigurationTypes.PLATFORM)?.terms,
        privacy: this.configService.get(ConfigurationTypes.PLATFORM)?.privacy,
        security: this.configService.get(ConfigurationTypes.PLATFORM)?.security,
        feedback: this.configService.get(ConfigurationTypes.PLATFORM)?.feedback,
        about: this.configService.get(ConfigurationTypes.PLATFORM)?.about,
        impact: this.configService.get(ConfigurationTypes.PLATFORM)?.impact,
        foundation: this.configService.get(ConfigurationTypes.PLATFORM)?.foundation,
        opensource: this.configService.get(ConfigurationTypes.PLATFORM)?.opensource,
        support: this.configService.get(ConfigurationTypes.PLATFORM)?.support,
        featureFlags: [
          {
            name: 'ssi',
            enabled: this.configService.get(ConfigurationTypes.SSI)?.enabled,
          },
          {
            name: 'communications',
            enabled: this.configService.get(ConfigurationTypes.COMMUNICATIONS)
              ?.enabled,
          },
          {
            name: 'communications-discussions',
            enabled: this.configService.get(ConfigurationTypes.COMMUNICATIONS)
              ?.discussions?.enabled,
          },
          {
            name: 'subscriptions',
            enabled: this.configService.get(ConfigurationTypes.HOSTING)
              ?.subscriptions?.enabled,
          },
          {
            name: 'notifications',
            enabled: this.configService.get(ConfigurationTypes.NOTIFICATIONS)
              ?.enabled,
          },
          {
            name: 'canvases',
            enabled: this.configService.get(ConfigurationTypes.COLLABORATION)
              ?.canvases?.enabled,
          },
        ],
      },
      sentry: {
        enabled: sentryConfig?.enabled,
        endpoint: sentryConfig?.endpoint,
        submitPII: sentryConfig?.submit_pii,
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

  async getTemplate(): Promise<ITemplate> {
    const template = {
      ...uxTemplate,
    };

    return template;
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
