import { IAssistantCapabilityToggle } from '@domain/community/virtual-assistant/dto/assistant.capability.toggle.interface';
import { Field, ObjectType } from '@nestjs/graphql';

/**
 * The per-user assistant-authority grant (FR-018 / US4). Per-capability
 * enable/disable toggles bounding what the assistant may do ON BEHALF OF this
 * user. Effective authority is enforced at the MCP-host gate as
 * `the user's CURRENT privileges ∩ { capability : enabled }`, never exceeding
 * the user. See contracts/assistant-authority.md §2.
 */
@ObjectType('UserSettingsAssistant')
export abstract class IUserSettingsAssistant {
  @Field(() => [IAssistantCapabilityToggle], {
    nullable: false,
    description:
      'Per-capability enable/disable toggles bounding what the assistant may do on behalf of this user (read-only by default).',
  })
  enabledCapabilities!: IAssistantCapabilityToggle[];
}
