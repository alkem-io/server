import { Field, InputType } from '@nestjs/graphql';
import { UpdatePlatformSettingsPrivacyInput } from './platform.settings.privacy.dto.update';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class UpdatePlatformSettingsEntityInput {
  @Field(() => UpdatePlatformSettingsPrivacyInput, {
    nullable: true,
    description: '',
  })
  @ValidateNested()
  @Type(() => UpdatePlatformSettingsPrivacyInput)
  privacy?: UpdatePlatformSettingsPrivacyInput;
}
