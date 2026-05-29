import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpTool, McpToolDefinition } from '../dto/mcp.types';

/**
 * Registry for MCP tools.
 * Manages tool registration and dispatches tool calls.
 */
@Injectable()
export class ToolRegistry {
  private tools: Map<string, McpTool> = new Map();

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Register a tool
   */
  register(tool: McpTool): void {
    const def = tool.getDefinition();
    this.tools.set(def.name, tool);
    this.logger.verbose?.(
      `Registered MCP tool: ${def.name}`,
      LogContext.MCP_SERVER
    );
  }

  /**
   * Get all registered tool definitions
   */
  listTools(): McpToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.getDefinition());
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): McpTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}
