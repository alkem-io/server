import { registerEnumType } from '@nestjs/graphql';

/**
 * The kind of an assistant capability (one MCP tool), driving the default
 * enablement and confirmation behaviour:
 *  - READ              → enabled by default; no confirmation
 *  - WRITE_ADDITIVE    → disabled by default; confirmation-gated; non-destructive write
 *  - WRITE_DESTRUCTIVE → disabled by default; confirmation-gated; may overwrite/remove content
 *
 * See contracts/assistant-authority.md §1 for the frozen v1 classification.
 */
export enum AssistantCapabilityKind {
  READ = 'READ',
  WRITE_ADDITIVE = 'WRITE_ADDITIVE',
  WRITE_DESTRUCTIVE = 'WRITE_DESTRUCTIVE',
}

registerEnumType(AssistantCapabilityKind, {
  name: 'AssistantCapabilityKind',
  description:
    'The kind of an assistant capability — READ is enabled by default; WRITE_* are disabled by default and confirmation-gated.',
});
