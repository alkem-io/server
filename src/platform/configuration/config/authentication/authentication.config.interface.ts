import { Field, ObjectType } from '@nestjs/graphql';
import { AuthenticationProviderConfig } from '@platform/configuration';
import { IAuthenticationProviderConfig } from '@platform/configuration';

@ObjectType('AuthenticationConfig')
export abstract class IAuthenticationConfig {
  @Field(() => [AuthenticationProviderConfig], {
    nullable: false,
    description: 'Alkemio Authentication Providers Config.',
  })
  providers?: IAuthenticationProviderConfig[];
}
