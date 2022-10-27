import { Field, ObjectType } from '@nestjs/graphql';
import { IActivity } from '@platform/activity';
import { IActivityLogEntry } from '../activity.log.entry.interface';

@ObjectType('ActivityCreatedSubscriptionResult')
export class ActivityCreatedSubscriptionResult {
  @Field(() => IActivityLogEntry, {
    nullable: false,
    description: 'The newly created activity',
  })
  activity!: IActivity;
}
