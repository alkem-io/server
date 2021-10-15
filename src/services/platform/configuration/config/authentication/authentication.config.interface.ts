import { Field, ObjectType } from '@nestjs/graphql';
import { AuthenticationProviderConfig } from './providers/authentication.provider.config.entity';
import { IAuthenticationProviderConfig } from './providers/authentication.provider.config.interface';

@ObjectType('AuthenticationConfig')
export abstract class IAuthenticationConfig {
  @Field(() => [AuthenticationProviderConfig], {
    nullable: false,
    description: 'Alkemio Authentication Providers Config.',
  })
  providers?: IAuthenticationProviderConfig[];
}
