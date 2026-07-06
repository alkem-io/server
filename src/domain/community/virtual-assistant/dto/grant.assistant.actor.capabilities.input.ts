import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AssistantCapabilityToggleInput } from '@domain/community/user-settings/dto/assistant.capability.toggle.input';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, ValidateNested } from 'class-validator';

/**
 * Admin per-capability grant on the `virtual-assistant` actor — governs
 * SYSTEM-INVOKED authority only (Flow B / FR-019). PLATFORM_ADMIN-gated at the
 * resolver; default read-only. Does NOT affect user-initiated work (that uses
 * the user's own grant on UserSettings.assistant). See
 * contracts/assistant-authority.md §3.
 *
 * The toggle shape reuses the existing `AssistantCapabilityToggleInput` (the
 * same per-capability `{capability, enabled}` used by the user grant) so the
 * settings UI, the user grant, and the admin grant share one input type.
 */
@InputType()
export class GrantAssistantActorCapabilitiesInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The VirtualAssistant actor whose admin grant is being set.',
  })
  virtualAssistantID!: string;

  @Field(() => [AssistantCapabilityToggleInput], {
    nullable: false,
    description:
      'Per-capability enable/disable toggles governing what the assistant may do system-invoked (default read-only).',
  })
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AssistantCapabilityToggleInput)
  enabledCapabilities!: AssistantCapabilityToggleInput[];
}
