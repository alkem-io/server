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
    return {
      template: await this.getTemplate(),
      authentication: {
        providers: await this.getAuthenticationProvidersConfig(),
        enabled: this.configService.get(ConfigurationTypes.Identity)
          ?.authentication?.enabled,
      },
      platform: {
        security: this.configService.get(ConfigurationTypes.Platform)?.security,
        privacy: this.configService.get(ConfigurationTypes.Platform)?.privacy,
        about: this.configService.get(ConfigurationTypes.Platform)?.about,
        feedback: this.configService.get(ConfigurationTypes.Platform)?.feedback,
        support: this.configService.get(ConfigurationTypes.Platform)?.support,
        terms: this.configService.get(ConfigurationTypes.Platform)?.terms,
        featureFlags: [
          {
            name: 'ssi',
            enabled: this.configService.get(ConfigurationTypes.Identity)?.ssi
              .enabled,
          },
          {
            name: 'communications',
            enabled: this.configService.get(ConfigurationTypes.Communications)
              ?.enabled,
          },
        ],
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
      await this.configService.get(ConfigurationTypes.Identity)
    )?.authentication?.providers?.ory;
    const res = {
      kratosPublicBaseURL: oryConfig.kratos_public_base_url,
      issuer: oryConfig.issuer,
    } as IOryConfig;
    return res;
  }
}
