import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';

@InputType()
export class CreateUserSettingsNotificationSpaceAdminInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  communicationMessageReceived!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when an application is received',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  communityApplicationReceived!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  communityNewMember!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when a contribution is added (admin)',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  collaborationCalloutContributionCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when the login email of an admin or lead of a Space I administer is changed (admin)',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  userEmailChanged!: CreateUserSettingsNotificationChannelsInput;
}
