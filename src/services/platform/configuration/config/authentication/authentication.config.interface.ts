import { Field, ObjectType } from '@nestjs/graphql';
import { AuthenticationProviderConfig } from './providers/authentication.provider.config.entity';
import { IAuthenticationProviderConfig } from './providers/authentication.provider.config.interface';

@ObjectType('AuthenticationConfig')
export abstract class IAuthenticationConfig {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Is authentication enabled?',
  })
  enabled?: boolean;

  @Field(() => [AuthenticationProviderConfig], {
    nullable: false,
    description: 'Cherrytwist Authentication Providers Config.',
  })
  providers?: IAuthenticationProviderConfig[];
}
