import { Field, ObjectType } from '@nestjs/graphql';
import { IActivity } from '@platform/activity';

@ObjectType('ActivityCreatedSubscriptionResult')
export class ActivityCreatedSubscriptionResult {
  @Field(() => IActivity, {
    nullable: false,
    description: 'The newly created activity',
  })
  activity!: IActivity;
}
