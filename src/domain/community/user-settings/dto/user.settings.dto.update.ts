import { SUPPORTED_INTERFACE_LANGUAGES } from '@common/constants/supported.languages';
import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, ValidateNested } from 'class-validator';
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
      "Update the user's design version. Any integer accepted (1 = legacy design generation, deprecated and scheduled for removal; 2 = current default design generation; 3+ reserved for future generations).",
  })
  @IsOptional()
  @IsInt()
  designVersion?: number;

  @Field(() => String, {
    nullable: true,
    description:
      "Set the user's interface language preference. Must be a value from the supported languages set. Any language write also latches languageOfferAnswered=true (FR-023 invariant).",
  })
  @IsOptional()
  @IsIn([...SUPPORTED_INTERFACE_LANGUAGES])
  language?: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Mark that this User has answered the one-time language offer. One-way latch: setting false is rejected (FR-005a).',
  })
  @IsOptional()
  languageOfferAnswered?: boolean;
}
