import { Field, ObjectType } from '@nestjs/graphql';
import { IOryConfig } from './ory.config.interface';

@ObjectType()
export class OryConfig implements IOryConfig {
  @Field(() => String, {
    nullable: false,
    description: 'Ory Issuer.',
  })
  issuer?: string;

  @Field(() => String, {
    nullable: false,
    description:
      'Ory Kratos Public Base URL. Used by all Kratos Public Clients.',
  })
  kratosPublicBaseURL?: string;
}
