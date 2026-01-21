import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserSettingsPrivacyInput } from './user.settings.privacy.dto.create';
import { CreateUserSettingsCommunicationInput } from './user.settings.communications.dto.create';
import { CreateUserSettingsNotificationInput } from './user.settings.notification.dto.create';
import { CreateUserSettingsHomeSpaceInput } from './user.settings.home.space.dto.create';

@InputType()
export class CreateUserSettingsInput {
  @Field(() => CreateUserSettingsPrivacyInput, {
    nullable: true,
    description: 'Settings related to Privacy.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsPrivacyInput)
  privacy?: CreateUserSettingsPrivacyInput;

  @Field(() => CreateUserSettingsCommunicationInput, {
    nullable: true,
    description: 'Settings related to this users Communication preferences.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsCommunicationInput)
  communication?: CreateUserSettingsCommunicationInput;

  @Field(() => CreateUserSettingsNotificationInput, {
    nullable: true,
    description: 'Settings related to this users Notification preferences.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationInput)
  notification?: CreateUserSettingsNotificationInput;

  @Field(() => CreateUserSettingsHomeSpaceInput, {
    nullable: true,
    description: 'Settings related to Home Space.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsHomeSpaceInput)
  homeSpace?: CreateUserSettingsHomeSpaceInput;
}
