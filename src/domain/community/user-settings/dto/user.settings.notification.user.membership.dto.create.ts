import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';

@InputType()
export class CreateUserSettingsNotificationUserMembershipInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification for community invitation',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  spaceCommunityInvitationReceived!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when I join a new community or when my application is declined',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  spaceCommunityJoined!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: true,
    description:
      'Receive a notification when I am invited to associate with an organisation',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  @IsOptional()
  organizationAssociateInvitationReceived?: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: true,
    description:
      'Receive a notification when an organisation decides on my application to associate',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  @IsOptional()
  organizationAssociateApplicationDecided?: CreateUserSettingsNotificationChannelsInput;
}
