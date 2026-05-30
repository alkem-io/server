import { McpApiKeyScope } from '../dto/mcp.types';

/** Operations an MCP API key can be scoped to. */
export type McpOperation = 'read' | 'tools';

/**
 * Determine whether a set of MCP API-key scopes permits an operation. Returns
 * an error message when the operation is denied, or undefined when allowed.
 *
 * - No scopes => the caller did not authenticate with an MCP API key
 *   (anonymous / Ory JWT / Ory API token). Authorization is then governed
 *   entirely by the ActorContext ACL, so no scope restriction applies here.
 * - spaceIds scoping is declared on keys but not yet enforceable per entity,
 *   so a space-restricted key fails closed rather than silently receiving
 *   platform-wide access.
 * - Otherwise the required operation ('read' for resource reads, 'tools' for
 *   tool calls) must be present in at least one scope entry.
 */
export const scopeViolation = (
  scopes: McpApiKeyScope[] | undefined,
  required: McpOperation
): string | undefined => {
  if (!scopes || scopes.length === 0) {
    return undefined;
  }
  if (scopes.some(scope => scope.spaceIds && scope.spaceIds.length > 0)) {
    return 'This API key is restricted to specific spaces (spaceIds), which the MCP server does not yet enforce. Use an unrestricted key.';
  }
  if (!scopes.some(scope => scope.operations?.includes(required))) {
    return `This API key lacks the required '${required}' operation.`;
  }
  return undefined;
};
