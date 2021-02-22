import { ObjectType, Field } from '@nestjs/graphql';
import { AadConfig } from './aad-config/aad.config.entity';
import { IAadConfig } from './aad-config/aad.config.interface';
import { SimpleAuthProviderConfig } from './aad-config/simple-auth.provider.config.entity';
import { ISimpleAuthProviderConfig } from './aad-config/simple-auth.provider.config.interface';
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
