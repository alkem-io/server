import { Field, ObjectType } from '@nestjs/graphql';
import {
  IAadClientConfig,
  IMsalConfig,
  IMsalAuth,
  IMsalCache,
  IAadApiConfig,
  IAadScope,
} from './aad.client.config.interface';

@ObjectType()
export class AadClientConfig implements IAadClientConfig {
  @Field(() => MsalConfig, {
    nullable: false,
    description:
      'Config for MSAL authentication library on Cherrytwist Web Client.',
  })
  msalConfig?: IMsalConfig;
  @Field(() => AadApiConfig, {
    nullable: false,
    description: 'Config for accessing the Cherrytwist API.',
  })
  apiConfig?: IAadApiConfig;
  @Field(() => AadScope, {
    nullable: false,
    description:
      'Scopes required for the user login. For OpenID Connect login flows, these are openid and profile + optionally offline_access if refresh tokens are utilized.',
  })
  loginRequest?: IAadScope;
  @Field(() => AadScope, {
    nullable: false,
    description:
      'Scopes for requesting a token. This is the Cherrytwist API app registration URI + ./default.',
  })
  tokenRequest?: IAadScope;
  @Field(() => AadScope, {
    nullable: false,
    description:
      'Scopes for silent token acquisition. Cherrytwist API scope + OpenID mandatory scopes.',
  })
  silentRequest?: IAadScope;
  @Field(() => Boolean, {
    nullable: false,
    description: 'Is the client and server authentication enabled?',
  })
  authEnabled: boolean;

  constructor(authEnabled: boolean) {
    this.authEnabled = authEnabled;
  }
}

@ObjectType()
export class MsalConfig implements IMsalConfig {
  @Field(() => MsalAuth, {
    nullable: false,
    description:
      'Azure Active Directory OpenID Connect endpoint configuration.',
  })
  auth: IMsalAuth;
  @Field(() => MsalCache, {
    nullable: false,
    description: 'Token cache configuration. ',
  })
  cache: IMsalCache;

  constructor(auth: IMsalAuth, cache: IMsalCache) {
    this.auth = auth;
    this.cache = cache;
  }
}

@ObjectType()
export class MsalAuth implements IMsalAuth {
  @Field(() => String, {
    nullable: false,
    description: 'Cherrytwist Web Client App Registration Client Id.',
  })
  clientId: string;
  @Field(() => String, {
    nullable: false,
    description: 'Azure Active Directory OpenID Connect Authority.',
  })
  authority: string;
  @Field(() => String, {
    nullable: false,
    description: 'Cherrytwist Web Client Login Redirect Uri.',
  })
  redirectUri: string;

  constructor(clientId: string, authority: string, redirectUri: string) {
    this.clientId = clientId;
    this.authority = authority;
    this.redirectUri = redirectUri;
  }
}

@ObjectType()
export class MsalCache implements IMsalCache {
  @Field(() => String, {
    nullable: true,
    description: 'Cache location, e.g. localStorage. ',
  })
  cacheLocation: string;
  @Field(() => Boolean, {
    nullable: true,
    description: 'Is the authentication information stored in a cookie?',
  })
  storeAuthStateInCookie: boolean;

  constructor(cacheLocation: string, storeAuthStateInCookie: boolean) {
    this.cacheLocation = cacheLocation;
    this.storeAuthStateInCookie = storeAuthStateInCookie;
  }
}

@ObjectType()
export class AadApiConfig implements IAadApiConfig {
  @Field(() => String, {
    nullable: false,
    description: 'Configuration payload for the Cherrytwist API.',
  })
  resourceScope: string;

  constructor(resourceUri: string, resourceScope: string) {
    this.resourceScope = resourceScope;
  }
}

@ObjectType()
export class AadScope implements IAadScope {
  @Field(() => [String], { nullable: false, description: 'OpenID Scopes.' })
  scopes: string[];

  constructor(scopes: string[]) {
    this.scopes = scopes;
  }
}
