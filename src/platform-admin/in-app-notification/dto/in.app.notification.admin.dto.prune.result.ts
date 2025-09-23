import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PruneInAppNotificationAdminResult {
import { Field, ObjectType, Int } from '@nestjs/graphql';

  @Field(() => Int, {
    nullable: false,
    description:
      'The number of InAppNotifications that were removed due to being outside the retention period.',
  })
  removedCountOutsideRetentionPeriod!: number;
  @Field(() => Number, {
    nullable: false,
    description:
      'The number of InAppNotifications that were removed due to exceeding the maximum allowed per user.',
  })
  removedCountExceedingUserLimit!: number;
}
