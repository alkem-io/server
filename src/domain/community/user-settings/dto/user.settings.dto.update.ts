import { Field, InputType } from '@nestjs/graphql';
import { UpdateUserSettingsPrivacyInput } from './user.settings.privacy.dto.update';
import { UpdateUserSettingsCommunicationInput } from './user.settings.communications.dto.update';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateUserSettingsNotificationInput } from './user.settings.notification.dto.update';
import { UpdateUserSettingsHomeSpaceInput } from './user.settings.home.space.dto.update';

@InputType()
export class UpdateUserSettingsEntityInput {
  @Field(() => UpdateUserSettingsPrivacyInput, {
    nullable: true,
    description: 'Settings related to Privacy.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsPrivacyInput)
  privacy?: UpdateUserSettingsPrivacyInput;

  @Field(() => UpdateUserSettingsCommunicationInput, {
    nullable: true,
    description: 'Settings related to this users Communication preferences.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsCommunicationInput)
  communication?: UpdateUserSettingsCommunicationInput;

  @Field(() => UpdateUserSettingsNotificationInput, {
    nullable: true,
    description: 'Settings related to this users Notifications preferences.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationInput)
  notification?: UpdateUserSettingsNotificationInput;

  @Field(() => UpdateUserSettingsHomeSpaceInput, {
    nullable: true,
    description: 'Settings related to Home Space.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsHomeSpaceInput)
  homeSpace?: UpdateUserSettingsHomeSpaceInput;
}
