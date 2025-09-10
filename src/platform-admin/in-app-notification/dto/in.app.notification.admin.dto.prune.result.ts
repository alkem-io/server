import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PruneInAppNotificationAdminResult {
  @Field(() => Number, {
    nullable: false,
    description: 'The number of InAppNotifications that were removed.',
  })
  removedCount!: number;
}
