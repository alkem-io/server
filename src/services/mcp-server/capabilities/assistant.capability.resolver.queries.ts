import { Query, Resolver } from '@nestjs/graphql';
import { ToolRegistry } from '../tools/tool.registry';
import { classifyCapability } from './assistant.capability.classification';
import { IAssistantCapability } from './assistant.capability.interface';

/**
 * `platformCapabilities` — the dynamic enumeration of the assistant's tool
 * surface (FR-006/FR-018). The capability LIST comes from the MCP tool registry
 * (never a hardcoded enum, so a newly added tool appears automatically); the
 * per-tool `kind` is assigned from the frozen v1 classification map
 * (contracts/assistant-authority.md §1) with the unknown ⇒ WRITE fail-safe so a
 * not-yet-classified tool enumerates as a write (disabled by default).
 *
 * Frozen as a top-level Query field per the contract; the `platformCapabilities`
 * name already namespaces it.
 */
@Resolver()
export class AssistantCapabilityResolverQueries {
  constructor(private readonly toolRegistry: ToolRegistry) {}

  @Query(() => [IAssistantCapability], {
    nullable: false,
    description:
      'The enumerable assistant capability surface (one per MCP tool), with each tool classified READ / WRITE_ADDITIVE / WRITE_DESTRUCTIVE.',
  })
  platformCapabilities(): IAssistantCapability[] {
    return this.toolRegistry.listTools().map(tool => ({
      name: tool.name,
      displayName: toDisplayName(tool.name),
      description: tool.description,
      kind: classifyCapability(tool.name),
    }));
  }
}

/** Derive a human label from a snake_case MCP tool name (no annotations in v1). */
const toDisplayName = (name: string): string =>
  name
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
