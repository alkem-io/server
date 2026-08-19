import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { AssistantCapabilityToggleInput } from './assistant.capability.toggle.input';

/**
 * Initial per-user assistant-authority grant. Omitted on normal user creation —
 * `getDefaultUserSettings()` seeds the read-only default. See
 * contracts/assistant-authority.md §2.
 */
@InputType()
export class CreateUserSettingsAssistantInput {
  @Field(() => [AssistantCapabilityToggleInput], {
    nullable: true,
    description:
      'Initial per-capability toggles for the assistant (defaults to read-only when omitted).',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AssistantCapabilityToggleInput)
  enabledCapabilities?: AssistantCapabilityToggleInput[];
}
