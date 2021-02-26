import { ObjectType, Field } from '@nestjs/graphql';
import { AadConfig } from './aad/aad.config.entity';
import { IAadConfig } from './aad/aad.config.interface';
import { SimpleAuthProviderConfig } from './simple-auth/simple-auth.provider.config.entity';
import { ISimpleAuthProviderConfig } from './simple-auth/simple-auth.provider.config.interface';
import { IAuthenticationProvidersConfig } from './authentication.providers.config.interface';

@ObjectType()
export class AuthenticationProvidersConfig
  implements IAuthenticationProvidersConfig {
  @Field(() => AadConfig, {
    nullable: false,
    description: 'Cherrytwist Client AAD config.',
  })
  aadConfig?: IAadConfig;

  @Field(() => SimpleAuthProviderConfig, {
    nullable: false,
    description: 'Cherrytwist Simple Auth config.',
  })
  simpleAuth?: ISimpleAuthProviderConfig;
}
