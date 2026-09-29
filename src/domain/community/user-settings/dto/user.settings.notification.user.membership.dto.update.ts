import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { NotificationSettingInput } from './notification.setting.input';

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
    description:
      'Receive a notification when I join a new community or when my application is declined',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  spaceCommunityJoined?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when I am invited to associate with an organisation',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  organizationAssociateInvitationReceived?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when an organisation decides on my application to associate',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  organizationAssociateApplicationDecided?: NotificationSettingInput;
}
