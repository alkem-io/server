import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntry } from '@services/api/activity-log/dto/activity.log.entry.interface';

@ObjectType('ActivityCreatedSubscriptionResult')
export class ActivityCreatedSubscriptionResult {
  @Field(() => IActivityLogEntry, {
    nullable: false,
    description: 'The newly created activity',
  })
  activity!: IActivityLogEntry;
}
