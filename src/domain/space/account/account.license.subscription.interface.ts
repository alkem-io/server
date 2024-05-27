import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AccountSubscription')
export abstract class IAccountSubscription {
  @Field(() => String, {
    description: 'The ',
  })
  name!: string;

  @Field(() => Date || null, {
    nullable: true,
    description: 'The expiry date of this subscription, if ever.',
  })
  expires?: Date;
}
