import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { NotificationSettingInput } from './notification.setting.input';
import { Type } from 'class-transformer';

@InputType()
export class UpdateUserSettingsNotificationUserMembershipInput {
  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive a notification for community invitation',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  spaceCommunityInvitationReceived?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive a notification when I join a new community',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  spaceCommunityJoined?: NotificationSettingInput;
}
