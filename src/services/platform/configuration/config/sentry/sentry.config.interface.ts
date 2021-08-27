import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Sentry')
export abstract class ISentryConfig {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag indicating if the client should use Sentry for monitoring.',
  })
  enabled!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag indicating if PII should be submitted on Sentry events.',
  })
  submitPII!: boolean;

  @Field(() => String, {
    nullable: false,
    description: 'URL to the Sentry endpoint.',
  })
  endpoint!: string;
}
