import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAadConfig } from './authentication-providers/aad/aad.config.interface';
import { ITemplate } from './template/template.interface';
import * as uxTemplate from '@templates/ux-template.json';
import { IConfig } from './config.interface';
import { IAuthenticationProviderConfig } from './authentication-providers/authentication.provider.config.interface';
import { ISimpleAuthProviderConfig } from './authentication-providers/simple-auth/simple-auth.provider.config.interface';

@Injectable()
export class KonfigService {
  constructor(private configService: ConfigService) {}

  async getConfig(): Promise<IConfig> {
    return {
      template: await this.getTemplate(),
      authenticationProviders: await this.getAuthenticationProvidersConfig(),
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

  async getAadConfig(): Promise<IAadConfig> {
    return (await this.configService.get<IAadConfig>(
      'aad_client'
    )) as IAadConfig;
  }

  async getSimpleAuthProviderConfig(): Promise<ISimpleAuthProviderConfig> {
    const res = (await this.configService.get<ISimpleAuthProviderConfig>(
      'simple_auth_provider'
    )) as ISimpleAuthProviderConfig;
    return res;
  }
}
