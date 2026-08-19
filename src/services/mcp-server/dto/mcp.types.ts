import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';

/**
 * MCP Resource definition for registration
 */
export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * MCP Resource provider interface
 */
export interface McpResourceProvider {
  /** Get resource definitions this provider handles */
  getResourceDefinitions(): McpResourceDefinition[];

  /** Check if this provider handles a given URI */
  matches(uri: string): boolean;

  /** Get the authorization policy for a resource */
  getAuthorizationPolicy(uri: string): Promise<IAuthorizationPolicy>;

  /** Read the resource content */
  read(uri: string, agentInfo: ActorContext): Promise<McpReadResourceResult>;
}

/**
 * Result of reading a resource
 */
export interface McpReadResourceResult {
  contents: McpResourceContent[];
}

export interface McpResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

/**
 * MCP Tool definition for registration
 */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP Tool provider interface
 */
export interface McpTool {
  /** Get the tool definition */
  getDefinition(): McpToolDefinition;

  /** Execute the tool */
  execute(args: unknown, agentInfo: ActorContext): Promise<McpToolResult>;
}

/**
 * Result of tool execution
 */
export interface McpToolResult {
  content: McpToolContent[];
  isError?: boolean;
}

export interface McpToolContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

/**
 * MCP API Key scope for restricting access
 */
export interface McpApiKeyScope {
  /** Restrict to specific spaces (empty means all accessible) */
  spaceIds?: string[];
  /** Allowed operations */
  operations: ('read' | 'tools')[];
}

/**
 * DI tokens for collecting MCP tools / resource providers as multi-provider
 * arrays. Each tool/resource is registered with `{ provide: MCP_TOOL,
 * useClass: X, multi: true }`, and the registries inject the resulting array —
 * so adding a tool is a single edit (one provider line) with no manual
 * register() call to forget.
 */
export const MCP_TOOL = Symbol('MCP_TOOL');
export const MCP_RESOURCE_PROVIDER = Symbol('MCP_RESOURCE_PROVIDER');

/**
 * Constants for MCP server
 */
export const MCP_CONSTANTS = {
  SERVER_NAME: 'alkemio-mcp-server',
  SERVER_VERSION: '1.0.0',
  URI_SCHEME: 'alkemio',
} as const;
