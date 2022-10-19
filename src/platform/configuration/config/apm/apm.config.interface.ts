import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('APM')
export abstract class IApmConfig {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Flag indicating if real user monitoring is enabled.',
  })
  rumEnabled!: boolean;

  @Field(() => String, {
    nullable: false,
    description: 'Endpoint where events are sent.',
  })
  endpoint!: string;
}
