import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';

@InputType()
export class CreateUserSettingsNotificationPlatformAdminInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: '[Admin] Receive notification when a new user signs up',
  })
  @IsBoolean()
  userProfileCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification when a user profile is removed',
  })
  @IsBoolean()
  userProfileRemoved!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification when a new L0 Space is created',
  })
  @IsBoolean()
  spaceCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification user is assigned or removed from a global role',
  })
  @IsBoolean()
  userGlobalRoleChanged!: CreateUserSettingsNotificationChannelsInput;
}
