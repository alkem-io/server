import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { IncomingMessage, ServerResponse } from 'http';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { scopeViolation } from './auth/mcp-scope';
import {
  MCP_CONSTANTS,
  McpApiKeyScope,
  McpResourceProvider,
  McpTool,
} from './dto/mcp.types';
import { McpToolArgsValidator } from './mcp-tool-args.validator';
import { ResourceRegistry } from './resources/resource.registry';
import { ToolRegistry } from './tools/tool.registry';

/**
 * Per-session MCP state. Each client session gets its OWN McpServer instance
 * connected to its OWN transport: the MCP SDK's Server can only be connected to
 * a single transport, so a shared server breaks the moment a second session
 * initializes. Each session also carries its own ActorContext and API-key
 * scopes, captured by the session's request handlers via closure — so
 * concurrent requests from different users can never read each other's identity
 * or authorization.
 */
interface McpSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  actorContext: ActorContext;
  scopes?: McpApiKeyScope[];
}

@Injectable()
export class McpServerService implements OnModuleInit {
  private sessions: Map<string, McpSession> = new Map();
  private readonly argsValidator = new McpToolArgsValidator();

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly toolRegistry: ToolRegistry,
    private readonly resourceRegistry: ResourceRegistry,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.verbose?.(
      'MCP Server service initialized',
      LogContext.MCP_SERVER
    );
  }

  /**
   * Build a fresh McpServer with request handlers bound to a specific session's
   * ActorContext and scopes. Both getters are evaluated lazily at request time,
   * so a session that authenticates on a later request still resolves correctly.
   */
  private createMcpServer(
    getActorContext: () => ActorContext,
    getScopes: () => McpApiKeyScope[] | undefined
  ): McpServer {
    const mcpServer = new McpServer(
      {
        name: MCP_CONSTANTS.SERVER_NAME,
        version: MCP_CONSTANTS.SERVER_VERSION,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Handle resources/list
    mcpServer.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = this.getResourceDefinitions();
      this.logger.verbose?.(
        `Listing ${resources.length} MCP resources`,
        LogContext.MCP_SERVER
      );
      return { resources };
    });

    // Handle resources/read
    mcpServer.server.setRequestHandler(
      ReadResourceRequestSchema,
      async request => {
        const { uri } = request.params;
        const actorContext = getActorContext();
        this.logger.verbose?.(
          `Reading MCP resource: ${uri}, user: ${actorContext.actorID || 'anonymous'}`,
          LogContext.MCP_SERVER
        );

        const scopeError = scopeViolation(getScopes(), 'read');
        if (scopeError) {
          throw new Error(scopeError);
        }

        const provider = this.getResourceProvider(uri);
        if (!provider) {
          throw new Error(`Resource not found: ${uri}`);
        }

        const result = await provider.read(uri, actorContext);

        return { contents: result.contents };
      }
    );

    // Handle tools/list
    mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.getToolDefinitions();
      this.logger.verbose?.(
        `Listing ${tools.length} MCP tools`,
        LogContext.MCP_SERVER
      );
      return { tools };
    });

    // Handle tools/call
    mcpServer.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;
      const actorContext = getActorContext();
      this.logger.verbose?.(
        `Calling MCP tool: ${name}, user: ${actorContext.actorID || 'anonymous'}`,
        LogContext.MCP_SERVER
      );

      // Authorization: the API key must carry the 'tools' operation.
      const scopeError = scopeViolation(getScopes(), 'tools');
      if (scopeError) {
        return { content: [{ type: 'text', text: scopeError }], isError: true };
      }

      const tool = this.getTool(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      // Validate arguments against the tool's declared input schema before
      // handing them to the tool implementation.
      const argError = this.argsValidator.validate(
        name,
        tool.getDefinition().inputSchema,
        args || {}
      );
      if (argError) {
        return { content: [{ type: 'text', text: argError }], isError: true };
      }

      const result = await tool.execute(args || {}, actorContext);

      // Return in MCP SDK expected format
      return {
        content: result.content,
        isError: result.isError,
      };
    });

    return mcpServer;
  }

  /**
   * Check if MCP server is enabled
   */
  isEnabled(): boolean {
    return this.configService.get('mcp.enabled', { infer: true }) ?? false;
  }

  /**
   * Handle an incoming MCP HTTP request
   */
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    sessionId?: string,
    actorContext?: ActorContext,
    scopes?: McpApiKeyScope[]
  ): Promise<void> {
    if (!this.isEnabled()) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'MCP server is disabled' }));
      return;
    }

    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        // Client sent a session ID we don't have (server restarted / expired).
        this.logger.verbose?.(
          `Session ${sessionId} not found, active sessions: ${this.sessions.size}`,
          LogContext.MCP_SERVER
        );
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32001,
              message: 'Session not found. Please reinitialize.',
            },
            id: null,
          })
        );
        return;
      }

      // Update the session's actor + scopes only if this request carries a fresh
      // authentication; otherwise preserve the identity established at init
      // (subsequent requests may rely on the session rather than re-sending a key).
      if (actorContext && actorContext.actorID && !actorContext.isAnonymous) {
        session.actorContext = actorContext;
        session.scopes = scopes;
        this.logger.verbose?.(
          `Updated actorContext for session ${sessionId}: userID=${actorContext.actorID}`,
          LogContext.MCP_SERVER
        );
      }

      await session.transport.handleRequest(req, res);
      return;
    }

    // No session ID — this is an initialization request. Create a dedicated
    // transport + McpServer for the new session.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true, // Use JSON instead of SSE for stateless HTTP
    });

    const session: McpSession = {
      transport,
      actorContext: actorContext ?? this.createAnonymousActorContext(),
      scopes,
    } as McpSession;
    session.server = this.createMcpServer(
      () => session.actorContext,
      () => session.scopes
    );

    // Clean up the session map when the transport closes.
    transport.onclose = () => {
      if (transport.sessionId) {
        this.sessions.delete(transport.sessionId);
      }
    };

    // Connect this session's server to its own transport (exactly once).
    await session.server.connect(transport);
    this.logger.verbose?.(
      'Created new MCP session transport',
      LogContext.MCP_SERVER
    );

    await transport.handleRequest(req, res);

    // sessionId is assigned by the transport during the initialize handshake.
    if (transport.sessionId && !this.sessions.has(transport.sessionId)) {
      this.sessions.set(transport.sessionId, session);
      this.logger.verbose?.(
        `Stored MCP session ${transport.sessionId}, total active: ${this.sessions.size}`,
        LogContext.MCP_SERVER
      );
    }
  }

  /**
   * Get all registered resource definitions (delegates to the registry).
   */
  getResourceDefinitions() {
    return this.resourceRegistry.listResources();
  }

  /**
   * Get all registered tool definitions (delegates to the registry).
   */
  getToolDefinitions() {
    return this.toolRegistry.listTools();
  }

  /**
   * Get a resource provider for a URI (delegates to the registry).
   */
  getResourceProvider(uri: string): McpResourceProvider | undefined {
    return this.resourceRegistry.getProvider(uri);
  }

  /**
   * Get a tool by name (delegates to the registry).
   */
  getTool(name: string): McpTool | undefined {
    return this.toolRegistry.getTool(name);
  }

  /**
   * Close all active sessions
   */
  async closeAllSessions(): Promise<void> {
    for (const session of this.sessions.values()) {
      await session.transport.close();
    }
    this.sessions.clear();
  }

  /**
   * Create an anonymous ActorContext for unauthenticated requests
   */
  private createAnonymousActorContext(): ActorContext {
    const actorContext = new ActorContext();
    actorContext.isAnonymous = true;
    actorContext.credentials = [];
    return actorContext;
  }
}
