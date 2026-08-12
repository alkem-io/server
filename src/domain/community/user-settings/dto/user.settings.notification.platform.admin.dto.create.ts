import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';

@InputType()
export class CreateUserSettingsNotificationPlatformAdminInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: '[Admin] Receive notification when a new user signs up',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  userProfileCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification when a user profile is removed',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  userProfileRemoved!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification when a new L0 Space is created',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  spaceCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification when a user is assigned to or removed from a global role',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  userGlobalRoleChanged!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification when a user changes their login email address',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  userEmailChanged!: CreateUserSettingsNotificationChannelsInput;
}
