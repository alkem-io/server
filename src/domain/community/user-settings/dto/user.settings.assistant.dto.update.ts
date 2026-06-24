import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { AssistantCapabilityToggleInput } from './assistant.capability.toggle.input';

/**
 * Per-user assistant-authority update (folded into the existing
 * updateUserSettings mutation — NOT a parallel mutation). Omitting
 * `enabledCapabilities` leaves the current grant untouched; providing it
 * replaces the set of toggles. See contracts/assistant-authority.md §2.
 */
@InputType()
export class UpdateUserSettingsAssistantInput {
  @Field(() => [AssistantCapabilityToggleInput], {
    nullable: true,
    description:
      'Per-capability enable/disable toggles bounding what the assistant may do on behalf of this user.',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AssistantCapabilityToggleInput)
  enabledCapabilities?: AssistantCapabilityToggleInput[];
}
