import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';

@InputType()
export class CreateUserSettingsNotificationOrganizationInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive notification when the organization you are admin of is messaged',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  adminMessageReceived!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when the organization you are admin of is mentioned',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  adminMentioned!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: true,
    description:
      'Receive a notification when an organization you administer is invited to a Space',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  @IsOptional()
  adminSpaceCommunityInvitation?: CreateUserSettingsNotificationChannelsInput;
}
