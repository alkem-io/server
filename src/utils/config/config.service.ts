import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITemplate } from './template/template.interface';
import * as uxTemplate from '@templates/ux-template.json';
import { IConfig } from './config.interface';
import { IAuthenticationProviderConfig } from './authentication/providers/authentication.provider.config.interface';
import { ISimpleAuthProviderConfig } from './authentication/providers/simple-auth/simple-auth.provider.config.interface';
import { IAadAuthProviderConfig } from './authentication/providers/aad/aad.config.interface';

@Injectable()
export class KonfigService {
  constructor(private configService: ConfigService) {}

  async getConfig(): Promise<IConfig> {
    return {
      template: await this.getTemplate(),
      authentication: {
        providers: await this.getAuthenticationProvidersConfig(),
        enabled: this.configService.get('service').authEnabled,
      },
    };
  }

  async getAuthenticationProvidersConfig(): Promise<
    IAuthenticationProviderConfig[]
  > {
    const authProviders = [
      {
        name: 'Azure Active Directory',
        label: '',
        icon: '',
        enabled: true,
        config: await this.getAadConfig(),
      },
      {
        name: 'Simple Auth',
        label: '',
        icon: '',
        enabled: true,
        config: await this.getSimpleAuthProviderConfig(),
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

  async getAadConfig(): Promise<IAadAuthProviderConfig> {
    return (await this.configService.get<IAadAuthProviderConfig>(
      'aad_client'
    )) as IAadAuthProviderConfig;
  }

  async getSimpleAuthProviderConfig(): Promise<ISimpleAuthProviderConfig> {
    const res = (await this.configService.get<ISimpleAuthProviderConfig>(
      'simple_auth_provider'
    )) as ISimpleAuthProviderConfig;
    return res;
  }
}
