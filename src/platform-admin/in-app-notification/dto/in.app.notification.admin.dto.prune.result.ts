import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PruneInAppNotificationAdminResult {
  @Field(() => Number, {
    nullable: false,
    description:
      'The number of InAppNotifications that were removed due to being outside the retention period.',
  })
  removedCountOutsideRetentionPeriod!: number;
}
