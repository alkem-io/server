import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  All,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  LoggerService,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  CreateMcpApiKeyInput,
  McpApiKeyService,
} from './auth/mcp-api-key.service';
import { McpAuthGuard } from './auth/mcp-auth.guard';
import { McpApiKeyScope } from './dto/mcp.types';
import { McpServerService } from './mcp-server.service';

/**
 * DTO for creating an MCP API key
 */
class CreateApiKeyDto {
  name!: string;
  description?: string;
  scopes?: McpApiKeyScope[];
  expiresInDays?: number;
}

/**
 * MCP Server Controller
 *
 * Handles MCP protocol requests via HTTP + SSE transport.
 * Also provides API key management endpoints.
 */
@Controller('/rest/mcp')
export class McpServerController {
  constructor(
    private readonly mcpServerService: McpServerService,
    private readonly mcpApiKeyService: McpApiKeyService,
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
    // Skip if this is an API key management request
    if (req.path.includes('/api-keys')) {
      return;
    }

    // Get agent info from Passport (set by McpAuthGuard)
    const agentInfo = (req as any).user as ActorContext | undefined;

    this.logger.verbose?.(
      `MCP ${req.method} request received, session: ${sessionId || 'new'}, user: ${agentInfo?.actorID || 'anonymous'}`,
      LogContext.MCP_SERVER
    );

    try {
      await this.mcpServerService.handleRequest(
        req as unknown as import('http').IncomingMessage,
        res as unknown as import('http').ServerResponse,
        sessionId,
        agentInfo
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

  /**
   * Create a new MCP API key for the authenticated user
   */
  @Post('api-keys')
  @HttpCode(201)
  @UseGuards(McpAuthGuard)
  async createApiKey(@Req() req: Request, @Body() body: CreateApiKeyDto) {
    const agentInfo = (req as any).user as ActorContext | undefined;
    const userId = agentInfo?.actorID;
    if (!userId) {
      return { error: 'User must be authenticated to create API keys' };
    }

    const input: CreateMcpApiKeyInput = {
      name: body.name,
      description: body.description,
      userId,
      scopes: body.scopes,
      expiresAt: body.expiresInDays
        ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
    };

    const result = await this.mcpApiKeyService.createApiKey(input);

    this.logger.verbose?.(
      `Created MCP API key ${result.id} for user ${userId}`,
      LogContext.MCP_SERVER
    );

    return {
      id: result.id,
      name: result.name,
      apiKey: result.apiKey, // Only returned on creation!
      expiresAt: result.expiresAt,
      message: 'Save this API key securely - it will not be shown again',
    };
  }

  /**
   * List API keys for the authenticated user
   */
  @Get('api-keys')
  @UseGuards(McpAuthGuard)
  async listApiKeys(@Req() req: Request) {
    const agentInfo = (req as any).user as ActorContext | undefined;
    const userId = agentInfo?.actorID;
    if (!userId) {
      return { error: 'User must be authenticated to list API keys' };
    }

    const keys = await this.mcpApiKeyService.listApiKeysForUser(userId);

    return keys.map(key => ({
      id: key.id,
      name: key.name,
      description: key.description,
      scopes: key.scopes,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdDate,
    }));
  }

  /**
   * Revoke (deactivate) an API key
   */
  @Delete('api-keys/:id')
  @HttpCode(204)
  @UseGuards(McpAuthGuard)
  async revokeApiKey(@Req() req: Request, @Param('id') keyId: string) {
    const agentInfo = (req as any).user as ActorContext | undefined;
    const userId = agentInfo?.actorID;
    if (!userId) {
      return { error: 'User must be authenticated to revoke API keys' };
    }

    await this.mcpApiKeyService.revokeApiKey(keyId, userId);

    this.logger.verbose?.(
      `Revoked MCP API key ${keyId} for user ${userId}`,
      LogContext.MCP_SERVER
    );
  }
}
