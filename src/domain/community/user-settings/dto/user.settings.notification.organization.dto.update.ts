import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { NotificationSettingInput } from './notification.setting.input';

@InputType()
export class UpdateUserSettingsNotificationOrganizationInput {
  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive notification when the organization you are admin of is messaged',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  adminMessageReceived?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when the organization you are admin of is mentioned',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  adminMentioned?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when an organization you administer is invited to a Space',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  adminSpaceCommunityInvitation?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when someone responds to an invitation to associate with an organisation you administer',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  adminAssociateInvitationResponse?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when someone applies to associate with an organisation you administer',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  adminAssociateApplicationReceived?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when someone joins an organisation you administer as an associate',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  adminAssociateJoined?: NotificationSettingInput;
}
