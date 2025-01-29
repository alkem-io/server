import { Field, InputType } from '@nestjs/graphql';
import { UpdatePlatformSettingsIntegrationInput } from './platform.settings.integration.dto.update';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class UpdatePlatformSettingsInput {
  @Field(() => UpdatePlatformSettingsIntegrationInput, {
    nullable: true,
    description: '',
  })
  @ValidateNested()
  @Type(() => UpdatePlatformSettingsIntegrationInput)
  integration?: UpdatePlatformSettingsIntegrationInput;
}
