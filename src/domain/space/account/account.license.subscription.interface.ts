import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AccountSubscription')
export abstract class IAccountSubscription {
  @Field(() => String, {
    description: 'The name of the Subscription.',
  })
  name!: string;

  @Field(() => Date, {
    nullable: true,
    description:
      'The expiry date of this subscription, null if it does never expire.',
  })
  expires?: Date;
}
