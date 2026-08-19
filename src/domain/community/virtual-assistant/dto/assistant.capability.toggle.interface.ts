import { Field, ObjectType } from '@nestjs/graphql';

/**
 * A single per-capability enable/disable toggle. The same shape backs both the
 * per-user authority grant (`UserSettingsAssistant.enabledCapabilities`) and the
 * admin grant on the actor (`VirtualAssistant.capabilityGrant`).
 * See contracts/assistant-authority.md §2/§3.
 */
@ObjectType('AssistantCapabilityToggle')
export class IAssistantCapabilityToggle {
  @Field(() => String, {
    nullable: false,
    description: 'The capability (MCP tool name) this toggle controls.',
  })
  capability!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether the capability is enabled.',
  })
  enabled!: boolean;
}
