import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITemplate } from './template/template.interface';
import * as uxTemplate from '@templates/ux-template.json';
import { IConfig } from './config.interface';
import { IAuthenticationProviderConfig } from './authentication/providers/authentication.provider.config.interface';
import { IDemoAuthProviderConfig } from './authentication/providers/demo-auth/demo-auth.provider.config.interface';
import { IAadAuthProviderConfig } from './authentication/providers/aad/aad.config.interface';

@Injectable()
export class KonfigService {
  constructor(private configService: ConfigService) {}

  async getConfig(): Promise<IConfig> {
    return {
      template: await this.getTemplate(),
      authentication: {
        providers: await this.getAuthenticationProvidersConfig(),
        enabled: this.configService.get('service').authenticationEnabled,
      },
    };
  }

  async getAuthenticationProvidersConfig(): Promise<
    IAuthenticationProviderConfig[]
  > {
    const authProviders = [
      {
        name: 'Azure Active Directory',
        label: 'Log in with Azure AD',
        icon: 'https://portal.azure.com/favicon.ico',
        enabled: true,
        config: await this.getAadConfig(),
      },
      {
        name: 'Demo Auth',
        label: 'Log in with Demo Authentication Provider',
        icon: '',
        enabled: true,
        config: await this.getDemoAuthProviderConfig(),
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
    const aadConfig = await this.configService.get('aad');
    const apiScope = `api://${aadConfig.clientID}/.default`;

    return {
      msalConfig: {
        auth: {
          ...aadConfig.client,
        },
        cache: {
          cacheLocation: 'localStorage', // This configures where your cache will be stored
          storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
        },
      },
      apiConfig: {
        resourceScope: apiScope,
      },
      loginRequest: {
        scopes: ['openid', 'profile', 'offline_access'],
      },
      tokenRequest: {
        scopes: [apiScope],
      },
      silentRequest: {
        scopes: ['openid', 'profile', apiScope],
      },
    };
  }

  async getDemoAuthProviderConfig(): Promise<IDemoAuthProviderConfig> {
    const res = (await this.configService.get<IDemoAuthProviderConfig>(
      'demo_auth_provider'
    )) as IDemoAuthProviderConfig;
    return res;
  }
}
