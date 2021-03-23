import { Field, ObjectType } from '@nestjs/graphql';
import { IDemoAuthProviderConfig } from './demo-auth.provider.config.interface';

@ObjectType()
export class DemoAuthProviderConfig implements IDemoAuthProviderConfig {
  @Field(() => String, {
    nullable: false,
    description: 'Demo authentication provider issuer endpoint.',
  })
  issuer?: string;

  @Field(() => String, {
    nullable: false,
    description:
      'Demo authentication provider token endpoint. Use json payload in the form of username + password to login and obtain valid jwt token.',
  })
  tokenEndpoint?: string;
}
