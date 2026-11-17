import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UpdatePlatformSettingsIntegrationInput } from './platform.settings.integration.dto.update';
import { UpdatePlatformSettingsSecurityInput } from './platform.settings.security.dto.update';

@InputType()
export class UpdatePlatformSettingsInput {
  @Field(() => UpdatePlatformSettingsIntegrationInput, {
    nullable: true,
    description: '',
  })
  @ValidateNested()
  @Type(() => UpdatePlatformSettingsIntegrationInput)
  integration?: UpdatePlatformSettingsIntegrationInput;

  @Field(() => UpdatePlatformSettingsSecurityInput, {
    nullable: true,
    description: 'The second-factor rule for platform roles.',
  })
  @ValidateNested()
  @Type(() => UpdatePlatformSettingsSecurityInput)
  security?: UpdatePlatformSettingsSecurityInput;
}
