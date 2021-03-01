import { ObjectType, Field } from '@nestjs/graphql';
import { IAuthenticationConfig } from './authentication.config.interface';
import { AuthenticationProviderConfig } from './providers/authentication.provider.config.entity';
import { IAuthenticationProviderConfig } from './providers/authentication.provider.config.interface';

@ObjectType()
export class AuthenticationConfig implements IAuthenticationConfig {
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
