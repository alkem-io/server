import { AssistantCapabilityKind } from './assistant.capability.kind';

/**
 * Canonical v1 classification map — the SINGLE FROZEN SOURCE OF TRUTH for the
 * `kind` of each MCP-tool capability (contracts/assistant-authority.md §1).
 *
 * The platform tool surface exposes NO readOnlyHint/destructiveHint annotations
 * in v1, so `kind` comes from this map. It is consumed identically by:
 *   - the `platformCapabilities` GraphQL resolver (this repo)
 *   - the read-only defaults in `getDefaultUserSettings`
 *   - the per-tool capability gate
 *   - assistant-service's runtime confirmation gate (`classify.py`) — a
 *     deliberate second copy, kept in lock-step by a parity test on each side.
 *
 * FAIL-SAFE: any tool ABSENT from this map is treated as a WRITE
 * (`UNKNOWN_TOOL_KIND`) — so a newly added, unclassified tool enumerates as a
 * write and is therefore DISABLED by default in both the user and admin grants,
 * and confirmation-gated by assistant-service, until it is explicitly added
 * here. A write mis-classified as READ would default *enabled* and skip
 * confirmation (FR-003/SC-002), so this map is security-sensitive.
 *
 * The server-side parity test (tasks/server.md T023a) and assistant-service's
 * (T039a) both assert their local classification equals this table.
 */
export const ASSISTANT_CAPABILITY_CLASSIFICATION: Readonly<
  Record<string, AssistantCapabilityKind>
> = Object.freeze({
  create_whiteboard: AssistantCapabilityKind.WRITE_ADDITIVE,
  update_whiteboard_content: AssistantCapabilityKind.WRITE_DESTRUCTIVE,
  // every other current tool is READ:
  search_content: AssistantCapabilityKind.READ,
  list_whiteboards: AssistantCapabilityKind.READ,
  analyze_whiteboard: AssistantCapabilityKind.READ,
  analyze_contributions: AssistantCapabilityKind.READ,
  analyze_audit_log: AssistantCapabilityKind.READ,
  community_activity_summary: AssistantCapabilityKind.READ,
  navigate_templates: AssistantCapabilityKind.READ,
});

/**
 * The fail-safe `kind` assigned to a tool absent from the classification map.
 * It is a WRITE so an unclassified tool is disabled-by-default everywhere.
 */
export const UNKNOWN_TOOL_KIND: AssistantCapabilityKind =
  AssistantCapabilityKind.WRITE_DESTRUCTIVE;

/**
 * Resolve the `kind` for a tool name, applying the unknown ⇒ WRITE fail-safe.
 */
export const classifyCapability = (toolName: string): AssistantCapabilityKind =>
  ASSISTANT_CAPABILITY_CLASSIFICATION[toolName] ?? UNKNOWN_TOOL_KIND;

/**
 * Whether a capability is enabled by default for a new user — only READ
 * capabilities are (read-only default, contracts/assistant-authority.md §2/§3).
 */
export const isCapabilityEnabledByDefault = (toolName: string): boolean =>
  classifyCapability(toolName) === AssistantCapabilityKind.READ;

/**
 * The READ-ONLY default toggle set for a new user (and the actor's default
 * grant): every classified capability present, READ ⇒ enabled, WRITE_* ⇒
 * disabled (contracts/assistant-authority.md §2/§3). A future tool absent from
 * the map is treated as WRITE ⇒ disabled (it simply isn't enabled here), so new
 * content-changing capabilities default disabled for existing users.
 *
 * NOTE: this is derived from the FROZEN classification map, not the live tool
 * registry, so it has no NestJS dependency and is safe to call from the user
 * domain. A tool added to the registry but not yet classified here will be
 * absent (⇒ disabled), which is the intended fail-safe.
 */
export const getReadOnlyDefaultCapabilityToggles = (): {
  capability: string;
  enabled: boolean;
}[] =>
  Object.keys(ASSISTANT_CAPABILITY_CLASSIFICATION).map(capability => ({
    capability,
    enabled: isCapabilityEnabledByDefault(capability),
  }));
