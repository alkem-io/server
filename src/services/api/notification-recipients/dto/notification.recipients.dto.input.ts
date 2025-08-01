import { UserNotificationSetting } from '@common/enums/user.notification.setting';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class NotificationRecipientsInput {
  @Field(() => UserNotificationSetting, {
    nullable: false,
    description: 'The type of notification setting to look up recipients for.',
  })
  notificationSetting!: UserNotificationSetting;

  @Field(() => UUID, {
    nullable: true,
    description: 'The ID of the entity to retrieve the recipients for.',
  })
  entityID?: string;
}
