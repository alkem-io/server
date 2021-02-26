import { ObjectType, Field, createUnionType } from '@nestjs/graphql';
import { AadConfig } from './aad/aad.config.entity';
import { IAadConfig } from './aad/aad.config.interface';
import { IAuthenticationProviderConfig } from './authentication.provider.config.interface';
import { SimpleAuthProviderConfig } from './simple-auth/simple-auth.provider.config.entity';
import { ISimpleAuthProviderConfig } from './simple-auth/simple-auth.provider.config.interface';

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

  @Field(() => ConfigUnion, {
    nullable: false,
    description: 'Configuration of the authenticaiton provider',
  })
  config?: IAadConfig | ISimpleAuthProviderConfig;
}

export const ConfigUnion = createUnionType({
  name: 'ConfigUnion',
  types: () => [AadConfig, SimpleAuthProviderConfig],
  resolveType(value) {
    if (value.msalConfig) {
      return AadConfig;
    }
    if (value.tokenEndpoint) {
      return SimpleAuthProviderConfig;
    }
    return null;
  },
});
