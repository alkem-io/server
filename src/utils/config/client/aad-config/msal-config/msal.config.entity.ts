import { ObjectType, Field } from '@nestjs/graphql';
import { MsalAuth } from './msal.auth.entity';
import { IMsalAuth } from './msal.auth.interface';
import { MsalCache } from './msal.cache.entity';
import { IMsalCache } from './msal.cache.interface';
import { IMsalConfig } from './msal.config.interface';

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
