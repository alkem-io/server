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
import { MCP_CONSTANTS, McpResourceProvider, McpTool } from './dto/mcp.types';

/**
 * Per-session MCP state. Each client session gets its OWN McpServer instance
 * connected to its OWN transport: the MCP SDK's Server can only be connected to
 * a single transport, so a shared server breaks the moment a second session
 * initializes. Each session also carries its own ActorContext, captured by the
 * session's request handlers via closure — so concurrent requests from
 * different users can never read each other's identity.
 */
interface McpSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  actorContext: ActorContext;
}

@Injectable()
export class McpServerService implements OnModuleInit {
  private resourceProviders: Map<string, McpResourceProvider> = new Map();
  private tools: Map<string, McpTool> = new Map();
  private sessions: Map<string, McpSession> = new Map();

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
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
   * ActorContext. `getActorContext` is evaluated lazily at request time, so a
   * session that authenticates on a later request still resolves correctly.
   */
  private createMcpServer(getActorContext: () => ActorContext): McpServer {
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

      const tool = this.getTool(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
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
   * Register a resource provider
   */
  registerResourceProvider(provider: McpResourceProvider): void {
    const definitions = provider.getResourceDefinitions();
    for (const def of definitions) {
      this.resourceProviders.set(def.uri, provider);
      this.logger.verbose?.(
        `Registered MCP resource: ${def.name} at ${def.uri}`,
        LogContext.MCP_SERVER
      );
    }
  }

  /**
   * Register a tool
   */
  registerTool(tool: McpTool): void {
    const def = tool.getDefinition();
    this.tools.set(def.name, tool);
    this.logger.verbose?.(
      `Registered MCP tool: ${def.name}`,
      LogContext.MCP_SERVER
    );
  }

  /**
   * Handle an incoming MCP HTTP request
   */
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    sessionId?: string,
    actorContext?: ActorContext
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

      // Update the session's actor only if this request carries a fresh
      // authentication; otherwise preserve the identity established at init
      // (subsequent requests may rely on the session rather than re-sending a key).
      if (actorContext && actorContext.actorID && !actorContext.isAnonymous) {
        session.actorContext = actorContext;
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
    } as McpSession;
    session.server = this.createMcpServer(() => session.actorContext);

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
   * Get all registered resource definitions
   */
  getResourceDefinitions() {
    const resources: Array<{
      uri: string;
      name: string;
      description: string;
      mimeType: string;
    }> = [];

    for (const provider of this.resourceProviders.values()) {
      resources.push(...provider.getResourceDefinitions());
    }

    return resources;
  }

  /**
   * Get all registered tool definitions
   */
  getToolDefinitions() {
    return Array.from(this.tools.values()).map(tool => tool.getDefinition());
  }

  /**
   * Get a resource provider for a URI
   */
  getResourceProvider(uri: string): McpResourceProvider | undefined {
    // First try exact match
    if (this.resourceProviders.has(uri)) {
      return this.resourceProviders.get(uri);
    }

    // Then try to find a provider that matches the URI pattern
    for (const provider of this.resourceProviders.values()) {
      if (provider.matches(uri)) {
        return provider;
      }
    }

    return undefined;
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): McpTool | undefined {
    return this.tools.get(name);
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
