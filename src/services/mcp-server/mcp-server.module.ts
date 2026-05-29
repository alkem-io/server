import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@platform/activity/activity.module';
import { McpApiKey } from './auth/mcp-api-key.entity';
import { McpApiKeyService } from './auth/mcp-api-key.service';
import { McpApiKeyStrategy } from './auth/mcp-api-key.strategy';
import { McpAuthGuard } from './auth/mcp-auth.guard';
import { McpServerController } from './mcp-server.controller';
import { McpServerService } from './mcp-server.service';
import { CalloutResourceProvider } from './resources/callout.resource';
import { ResourceRegistry } from './resources/resource.registry';
import { SpaceResourceProvider } from './resources/space.resource';
import { WhiteboardResourceProvider } from './resources/whiteboard.resource';
import { CommunityActivitySummaryTool } from './tools/community-activity-summary.tool';
import { ContributionsAnalyzeTool } from './tools/contributions-analyze.tool';
import { TemplateNavigatorTool } from './tools/template-navigator.tool';
import { ToolRegistry } from './tools/tool.registry';
import { WhiteboardAnalyzeTool } from './tools/whiteboard-analyze.tool';
import { WhiteboardListTool } from './tools/whiteboard-list.tool';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([McpApiKey, Whiteboard, InnovationPack]),
    PassportModule,
    ActorContextModule,
    AuthorizationModule,
    WhiteboardModule,
    CalloutModule,
    SpaceModule,
    CollaborationModule,
    SpaceLookupModule,
    ActivityModule,
    TemplateModule,
  ],
  controllers: [McpServerController],
  providers: [
    McpServerService,
    McpApiKeyService,
    McpApiKeyStrategy,
    McpAuthGuard,
    // Registries
    ResourceRegistry,
    ToolRegistry,
    // Resource Providers
    WhiteboardResourceProvider,
    CalloutResourceProvider,
    SpaceResourceProvider,
    // Tools
    WhiteboardAnalyzeTool,
    WhiteboardListTool,
    ContributionsAnalyzeTool,
    CommunityActivitySummaryTool,
    TemplateNavigatorTool,
  ],
  exports: [McpServerService, McpApiKeyService],
})
export class McpServerModule implements OnModuleInit {
  constructor(
    private readonly mcpServerService: McpServerService,
    private readonly resourceRegistry: ResourceRegistry,
    private readonly toolRegistry: ToolRegistry,
    private readonly whiteboardResourceProvider: WhiteboardResourceProvider,
    private readonly calloutResourceProvider: CalloutResourceProvider,
    private readonly spaceResourceProvider: SpaceResourceProvider,
    private readonly whiteboardAnalyzeTool: WhiteboardAnalyzeTool,
    private readonly whiteboardListTool: WhiteboardListTool,
    private readonly contributionsAnalyzeTool: ContributionsAnalyzeTool,
    private readonly communityActivitySummaryTool: CommunityActivitySummaryTool,
    private readonly templateNavigatorTool: TemplateNavigatorTool
  ) {}

  onModuleInit(): void {
    // Register resource providers
    this.resourceRegistry.register(this.whiteboardResourceProvider);
    this.resourceRegistry.register(this.calloutResourceProvider);
    this.resourceRegistry.register(this.spaceResourceProvider);

    // Register tools
    this.toolRegistry.register(this.whiteboardAnalyzeTool);
    this.toolRegistry.register(this.whiteboardListTool);
    this.toolRegistry.register(this.contributionsAnalyzeTool);
    this.toolRegistry.register(this.communityActivitySummaryTool);
    this.toolRegistry.register(this.templateNavigatorTool);

    // Wire up registries to the MCP service
    for (const provider of this.resourceRegistry.listProviders()) {
      this.mcpServerService.registerResourceProvider(provider);
    }

    for (const tool of this.toolRegistry.listTools()) {
      const toolImpl = this.toolRegistry.getTool(tool.name);
      if (toolImpl) {
        this.mcpServerService.registerTool(toolImpl);
      }
    }
  }
}
