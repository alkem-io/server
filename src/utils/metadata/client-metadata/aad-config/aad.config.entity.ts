import { Field, ObjectType } from '@nestjs/graphql';
import { IAadConfig } from './aad.config.interface';
import { ApiConfig } from './api-config/api.config.entity';
import { IApiConfig } from './api-config/api.config.interface';
import { MsalConfig } from './msal-config/msal.config.entity';
import { IMsalConfig } from './msal-config/msal.config.interface';
import { Scope } from './scope/scope.entity';
import { IScope } from './scope/scope.interface';

@ObjectType()
export class AadConfig implements IAadConfig {
  @Field(() => MsalConfig, {
    nullable: false,
    description:
      'Config for MSAL authentication library on Cherrytwist Web Client.',
  })
  msalConfig?: IMsalConfig;

  @Field(() => ApiConfig, {
    nullable: false,
    description: 'Config for accessing the Cherrytwist API.',
  })
  apiConfig?: IApiConfig;

  @Field(() => Scope, {
    nullable: false,
    description:
      'Scopes required for the user login. For OpenID Connect login flows, these are openid and profile + optionally offline_access if refresh tokens are utilized.',
  })
  loginRequest?: IScope;

  @Field(() => Scope, {
    nullable: false,
    description:
      'Scopes for requesting a token. This is the Cherrytwist API app registration URI + ./default.',
  })
  tokenRequest?: IScope;

  @Field(() => Scope, {
    nullable: false,
    description:
      'Scopes for silent token acquisition. Cherrytwist API scope + OpenID mandatory scopes.',
  })
  silentRequest?: IScope;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Is the client and server authentication enabled?',
  })
  authEnabled: boolean;

  constructor(authEnabled: boolean) {
    this.authEnabled = authEnabled;
  }
}
