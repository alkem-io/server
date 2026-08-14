import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  All,
  Controller,
  Headers,
  HttpCode,
  Inject,
  LoggerService,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpAuthGuard } from './auth/mcp-auth.guard';
import { McpApiKeyScope } from './dto/mcp.types';
import { McpServerService } from './mcp-server.service';

/**
 * MCP Server Controller
 *
 * Handles MCP protocol requests via HTTP + SSE transport.
 *
 * API-key LIFECYCLE (mint/list/revoke) does NOT live here, and never has a
 * REST surface again (workspace#038, R-038-2). The three former
 * `/rest/mcp/api-keys` handlers were deleted: they were internet-reachable
 * (Traefik `PathPrefix(/rest/mcp)`) and guarded only by `McpAuthGuard`, so a
 * leaked MCP key could mint MORE MCP keys — uncapped, unaudited. Lifecycle
 * operations are GraphQL-only (`mintMcpApiKey`, `me.mcpApiKeys`,
 * `revokeMcpApiKey`, `platformAdmin.mcpApiKeys`, `adminRevokeMcpApiKey`),
 * which never consults `McpAuthGuard` — see
 * `mcp-api-key.resolver.mutations.ts` and `admin.mcp.api.key.resolver.fields.ts`.
 * This closes the escalation by construction rather than by a reject-branch;
 * verified by a negative test asserting these paths 404
 * (`mcp-server.controller.spec.ts`, US3-AS3).
 */
@Controller('/rest/mcp')
export class McpServerController {
  constructor(
    private readonly mcpServerService: McpServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Main MCP endpoint - handles both GET (SSE) and POST (messages)
   *
   * The MCP Streamable HTTP transport specification uses:
   * - GET requests to establish SSE connections for server-to-client messages
   * - POST requests for client-to-server messages
   */
  @All()
  @HttpCode(200)
  @UseGuards(McpAuthGuard)
  async handleMcpRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('mcp-session-id') sessionId?: string
  ): Promise<void> {
    // Get agent info from Passport (set by McpAuthGuard)
    const agentInfo = (req as any).user as ActorContext | undefined;
    // API-key scopes, set by McpApiKeyStrategy when authenticated via a key.
    const scopes = (req as any).mcpApiKeyScopes as McpApiKeyScope[] | undefined;
    // The validated key's id, set by McpApiKeyStrategy alongside the scopes —
    // threaded through to the session so it can be revalidated on the
    // no-fresh-auth branch (workspace#038 FR-013).
    const apiKeyId = (req as any).mcpApiKeyId as string | undefined;

    this.logger.verbose?.(
      `MCP ${req.method} request received, session: ${sessionId || 'new'}, user: ${agentInfo?.actorID || 'anonymous'}`,
      LogContext.MCP_SERVER
    );

    try {
      await this.mcpServerService.handleRequest(
        req as unknown as import('http').IncomingMessage,
        res as unknown as import('http').ServerResponse,
        sessionId,
        agentInfo,
        scopes,
        apiKeyId
      );
    } catch (error) {
      this.logger.error?.(
        `MCP request error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.MCP_SERVER
      );

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
        });
      }
    }
  }
}
