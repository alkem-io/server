import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
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
}
