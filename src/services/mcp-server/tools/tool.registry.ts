import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MCP_TOOL, McpTool, McpToolDefinition } from '../dto/mcp.types';

/**
 * Registry for MCP tools — the single source of truth for the tool set.
 *
 * Tools are collected via the MCP_TOOL multi-provider token and indexed by name
 * at construction; there is no manual register() step. McpServerService reads
 * the tool set from here rather than maintaining its own copy.
 */
@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, McpTool>();

  constructor(
    @Inject(MCP_TOOL) tools: McpTool[],
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    for (const tool of tools) {
      const def = tool.getDefinition();
      if (this.tools.has(def.name)) {
        this.logger.warn?.(
          `Duplicate MCP tool name '${def.name}' — ignoring later registration`,
          LogContext.MCP_SERVER
        );
        continue;
      }
      this.tools.set(def.name, tool);
      this.logger.verbose?.(
        `Registered MCP tool: ${def.name}`,
        LogContext.MCP_SERVER
      );
    }
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
