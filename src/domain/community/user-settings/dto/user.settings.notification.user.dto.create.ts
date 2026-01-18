import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsBoolean, ValidateNested } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';
import { CreateUserSettingsNotificationUserMembershipInput } from './user.settings.notification.user.membership.dto.create';

@InputType()
export class CreateUserSettingsNotificationUserInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive notification when I receive a message.',
  })
  @IsBoolean()
  messageReceived!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification you are mentioned',
  })
  @IsBoolean()
  mentioned!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  @IsBoolean()
  commentReply!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationUserMembershipInput, {
    nullable: true,
    description: 'Settings related to User Membership Notifications.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationUserMembershipInput)
  membership!: CreateUserSettingsNotificationUserMembershipInput;
}
