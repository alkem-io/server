import { Field, ObjectType } from '@nestjs/graphql';
import { AssistantCapabilityKind } from './assistant.capability.kind';

/**
 * One enumerable assistant capability (== one MCP tool). The LIST is dynamic
 * (sourced from the MCP tool registry, never hardcoded — FR-006); the per-tool
 * `kind` comes from the frozen v1 classification map
 * (contracts/assistant-authority.md §1), with unknown ⇒ WRITE fail-safe.
 */
@ObjectType('AssistantCapability')
export class IAssistantCapability {
  @Field(() => String, {
    nullable: false,
    description: 'The MCP tool name, e.g. "search_content".',
  })
  name!: string;

  @Field(() => String, {
    nullable: false,
    description: 'Human-readable label for the capability toggle.',
  })
  displayName!: string;

  @Field(() => String, {
    nullable: false,
    description: 'What the capability does (for the settings UI).',
  })
  description!: string;

  @Field(() => AssistantCapabilityKind, {
    nullable: false,
    description:
      'READ | WRITE_ADDITIVE | WRITE_DESTRUCTIVE — drives the default (READ enabled, WRITE_* disabled) and confirmation behaviour.',
  })
  kind!: AssistantCapabilityKind;
}
