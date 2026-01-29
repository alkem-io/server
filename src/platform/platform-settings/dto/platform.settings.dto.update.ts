import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UpdatePlatformSettingsIntegrationInput } from './platform.settings.integration.dto.update';

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
