import { SUPPORTED_INTERFACE_LANGUAGES } from '@common/constants/supported.languages';
import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { CreateUserSettingsAssistantInput } from './user.settings.assistant.dto.create';
import { CreateUserSettingsCommunicationInput } from './user.settings.communications.dto.create';
import { CreateUserSettingsHomeSpaceInput } from './user.settings.home.space.dto.create';
import { CreateUserSettingsNotificationInput } from './user.settings.notification.dto.create';
import { CreateUserSettingsPrivacyInput } from './user.settings.privacy.dto.create';

@InputType()
export class CreateUserSettingsInput {
  @Field(() => CreateUserSettingsPrivacyInput, {
    nullable: true,
    description: 'Settings related to Privacy.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsPrivacyInput)
  privacy?: CreateUserSettingsPrivacyInput;

  @Field(() => CreateUserSettingsAssistantInput, {
    nullable: true,
    description: 'Initial AI assistant authority settings for this User.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateUserSettingsAssistantInput)
  assistant?: CreateUserSettingsAssistantInput;

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

  @Field(() => Int, {
    nullable: true,
    description:
      'Initial design version for this User. Defaults to 2 (the current default design generation) when omitted. Pass 1 to opt into the legacy design (deprecated; scheduled for removal).',
  })
  @IsOptional()
  @IsInt()
  designVersion?: number;

  @Field(() => String, {
    nullable: true,
    description:
      'Initial interface language for this User. Null = user has never chosen a language.',
  })
  @IsOptional()
  @IsIn([...SUPPORTED_INTERFACE_LANGUAGES])
  language?: string | null;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Whether this User has already answered the one-time language offer (global flag — FR-005a).',
  })
  @IsOptional()
  languageOfferAnswered?: boolean;
}
