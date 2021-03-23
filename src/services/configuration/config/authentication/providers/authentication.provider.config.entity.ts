import { AuthenticationProviderConfigs } from '@common/enums';
import { createUnionType, Field, ObjectType } from '@nestjs/graphql';
import { AadAuthProviderConfig } from './aad/aad.config.entity';
import { IAuthenticationProviderConfig } from './authentication.provider.config.interface';
import { DemoAuthProviderConfig } from './demo-auth/demo-auth.provider.config.entity';

@ObjectType()
export class AuthenticationProviderConfig
  implements IAuthenticationProviderConfig {
  @Field(() => String, {
    nullable: false,
    description: 'Name of the authentication provider.',
  })
  name?: string;

  @Field(() => String, {
    nullable: false,
    description: 'Label of the authentication provider.',
  })
  label?: string;

  @Field(() => String, {
    nullable: false,
    description:
      'CDN location of an icon of the authentication provider login button.',
  })
  icon?: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Is the authentication provider enabled?',
  })
  enabled?: boolean;

  @Field(() => AuthenticationProviderConfigUnion, {
    nullable: false,
    description: 'Configuration of the authenticaiton provider',
  })
  config?: typeof AuthenticationProviderConfigUnion;
}

export const AuthenticationProviderConfigUnion = createUnionType({
  name: 'AuthenticationProviderConfigUnion',
  types: () => [AadAuthProviderConfig, DemoAuthProviderConfig],
  resolveType(value) {
    if (value.msalConfig) {
      return AuthenticationProviderConfigs.AAD;
    }
    if (value.tokenEndpoint) {
      return AuthenticationProviderConfigs.DEMO_AUTH;
    }
    return null;
  },
});
