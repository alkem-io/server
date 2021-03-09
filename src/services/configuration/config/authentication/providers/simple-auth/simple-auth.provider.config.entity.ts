import { Field, ObjectType } from '@nestjs/graphql';
import { ISimpleAuthProviderConfig } from './simple-auth.provider.config.interface';

@ObjectType()
export class SimpleAuthProviderConfig implements ISimpleAuthProviderConfig {
  @Field(() => String, {
    nullable: false,
    description: 'Simple authentication provider issuer endpoint.',
  })
  issuer?: string;

  @Field(() => String, {
    nullable: false,
    description:
      'Simple authentication provider token endpoint. Use json payload in the form of username + password to login and obtain valid jwt token.',
  })
  tokenEndpoint?: string;
}
