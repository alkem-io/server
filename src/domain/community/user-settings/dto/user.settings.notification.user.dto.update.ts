import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { UpdateUserSettingsNotificationUserMembershipInput } from './user.settings.notification.user.membership.dto.update';
import { Type } from 'class-transformer';

@InputType()
export class UpdateUserSettingsNotificationUserInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive notification when I receive a message.',
  })
  messageReceived?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive notification I send a message to a User, Organization or Space.',
  })
  copyOfMessageSent?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification you are mentioned',
  })
  mentioned?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  commentReply?: boolean;

  @Field(() => UpdateUserSettingsNotificationUserMembershipInput, {
    nullable: true,
    description: 'Settings related to User Membership Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationUserMembershipInput)
  membership!: UpdateUserSettingsNotificationUserMembershipInput;
}
