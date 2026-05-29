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

@Injectable()
export class McpServerService implements OnModuleInit {
  private mcpServer: McpServer;
  private resourceProviders: Map<string, McpResourceProvider> = new Map();
  private tools: Map<string, McpTool> = new Map();
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();
  private sessionActorContext: Map<string, ActorContext> = new Map();
  // Track current request's session ID for use in handlers
  private currentSessionId: string | undefined;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.mcpServer = new McpServer(
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
  }

  async onModuleInit(): Promise<void> {
    this.setupRequestHandlers();
    this.logger.verbose?.(
      'MCP Server service initialized',
      LogContext.MCP_SERVER
    );
  }

  /**
   * Set up MCP SDK request handlers for resources and tools
   */
  private setupRequestHandlers(): void {
    // Handle resources/list
    this.mcpServer.server.setRequestHandler(
      ListResourcesRequestSchema,
      async () => {
        const resources = this.getResourceDefinitions();
        this.logger.verbose?.(
          `Listing ${resources.length} MCP resources`,
          LogContext.MCP_SERVER
        );
        return { resources };
      }
    );

    // Handle resources/read
    this.mcpServer.server.setRequestHandler(
      ReadResourceRequestSchema,
      async request => {
        const { uri } = request.params;
        const agentInfo = this.getCurrentActorContext();
        this.logger.verbose?.(
          `Reading MCP resource: ${uri}, user: ${agentInfo.actorID || 'anonymous'}`,
          LogContext.MCP_SERVER
        );

        const provider = this.getResourceProvider(uri);
        if (!provider) {
          throw new Error(`Resource not found: ${uri}`);
        }

        const result = await provider.read(uri, agentInfo);

        return { contents: result.contents };
      }
    );

    // Handle tools/list
    this.mcpServer.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => {
        const tools = this.getToolDefinitions();
        this.logger.verbose?.(
          `Listing ${tools.length} MCP tools`,
          LogContext.MCP_SERVER
        );
        return { tools };
      }
    );

    // Handle tools/call
    this.mcpServer.server.setRequestHandler(
      CallToolRequestSchema,
      async request => {
        const { name, arguments: args } = request.params;
        const agentInfo = this.getCurrentActorContext();
        this.logger.verbose?.(
          `Calling MCP tool: ${name}, user: ${agentInfo.actorID || 'anonymous'}`,
          LogContext.MCP_SERVER
        );

        const tool = this.getTool(name);
        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }

        const result = await tool.execute(args || {}, agentInfo);

        // Return in MCP SDK expected format
        return {
          content: result.content,
          isError: result.isError,
        };
      }
    );

    this.logger.verbose?.(
      'MCP request handlers registered',
      LogContext.MCP_SERVER
    );
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
    agentInfo?: ActorContext
  ): Promise<void> {
    if (!this.isEnabled()) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'MCP server is disabled' }));
      return;
    }

    // Get transport for existing session or create new one
    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId) {
      transport = this.transports.get(sessionId);
      if (transport) {
        this.logger.verbose?.(
          `Reusing existing transport for session ${sessionId}, agentInfo.actorID: ${agentInfo?.actorID || 'none'}`,
          LogContext.MCP_SERVER
        );
        // Set current session ID for use in handlers
        this.currentSessionId = sessionId;
        // Update agent info only if the new one is authenticated
        // This preserves the original authenticated session if subsequent requests
        // don't include authentication credentials (relying on session)
        if (agentInfo && agentInfo.actorID && !agentInfo.isAnonymous) {
          this.sessionActorContext.set(sessionId, agentInfo);
          this.logger.verbose?.(
            `Updated agentInfo for session ${sessionId}: userID=${agentInfo.actorID}`,
            LogContext.MCP_SERVER
          );
        } else {
          // Log that we're preserving the existing session info
          const existingInfo = this.sessionActorContext.get(sessionId);
          this.logger.verbose?.(
            `Preserving existing agentInfo for session ${sessionId}: userID=${existingInfo?.actorID || 'none'}`,
            LogContext.MCP_SERVER
          );
        }
      } else {
        // Client sent session ID but we don't have it - return 404
        // This happens if server restarted or session expired
        this.logger.verbose?.(
          `Session ${sessionId} not found, active sessions: ${this.transports.size}`,
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
    } else {
      // No session ID - create new transport (for initialization)
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: true, // Use JSON instead of SSE for stateless HTTP
      });

      // Connect the transport to our MCP server
      await this.mcpServer.connect(transport);

      this.logger.verbose?.(`Created new MCP transport`, LogContext.MCP_SERVER);
    }

    // Handle the request
    await transport.handleRequest(req, res);

    // Session ID is only available after first handleRequest (when initialize is called)
    // Store the transport and agent info in our session maps for subsequent requests
    if (transport.sessionId && !this.transports.has(transport.sessionId)) {
      this.transports.set(transport.sessionId, transport);
      // Set current session ID for use in handlers
      this.currentSessionId = transport.sessionId;
      // Store agent info for this session
      if (agentInfo) {
        this.sessionActorContext.set(transport.sessionId, agentInfo);
      }
      this.logger.verbose?.(
        `Stored MCP session ${transport.sessionId}, total active: ${this.transports.size}`,
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
   * Get the underlying McpServer instance (for advanced usage)
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }

  /**
   * Close all active sessions
   */
  async closeAllSessions(): Promise<void> {
    for (const transport of this.transports.values()) {
      await transport.close();
    }
    this.transports.clear();
    this.sessionActorContext.clear();
    this.currentSessionId = undefined;
  }

  /**
   * Get the ActorContext for the current request
   * Uses the stored session ActorContext if available, otherwise creates anonymous
   */
  private getCurrentActorContext(): ActorContext {
    if (this.currentSessionId) {
      const agentInfo = this.sessionActorContext.get(this.currentSessionId);
      if (agentInfo) {
        return agentInfo;
      }
    }
    return this.createAnonymousActorContext();
  }

  /**
   * Create an anonymous ActorContext for unauthenticated requests
   */
  private createAnonymousActorContext(): ActorContext {
    const agentInfo = new ActorContext();
    agentInfo.isAnonymous = true;
    agentInfo.credentials = [];
    return agentInfo;
  }
}
