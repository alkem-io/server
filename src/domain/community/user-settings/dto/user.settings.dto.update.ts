import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, ValidateNested } from 'class-validator';
import { UpdateUserSettingsAssistantInput } from './user.settings.assistant.dto.update';
import { UpdateUserSettingsCommunicationInput } from './user.settings.communications.dto.update';
import { UpdateUserSettingsHomeSpaceInput } from './user.settings.home.space.dto.update';
import { UpdateUserSettingsNotificationInput } from './user.settings.notification.dto.update';
import { UpdateUserSettingsPrivacyInput } from './user.settings.privacy.dto.update';

@InputType()
export class UpdateUserSettingsEntityInput {
  @Field(() => UpdateUserSettingsPrivacyInput, {
    nullable: true,
    description: 'Settings related to Privacy.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsPrivacyInput)
  privacy?: UpdateUserSettingsPrivacyInput;

  @Field(() => UpdateUserSettingsAssistantInput, {
    nullable: true,
    description:
      'Settings related to the AI assistant authority for this User.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserSettingsAssistantInput)
  assistant?: UpdateUserSettingsAssistantInput;

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

  @Field(() => Int, {
    nullable: true,
    description:
      "Update the user's design version. Any integer accepted (1 = legacy design generation; 2 = current default design generation; 3+ reserved for future generations).",
  })
  @IsOptional()
  @IsInt()
  designVersion?: number;
}
