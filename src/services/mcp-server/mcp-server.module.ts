import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { SpaceModule } from '@domain/space/space/space.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@platform/activity/activity.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { SearchModule } from '@services/api/search/search.module';
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
import { AuditLogAnalyzeTool } from './tools/audit-log-analyze.tool';
import { CommunityActivitySummaryTool } from './tools/community-activity-summary.tool';
import { ContributionsAnalyzeTool } from './tools/contributions-analyze.tool';
import { CreateWhiteboardTool } from './tools/create-whiteboard.tool';
import { SearchContentTool } from './tools/search-content.tool';
import { TemplateNavigatorTool } from './tools/template-navigator.tool';
import { ToolRegistry } from './tools/tool.registry';
import { UpdateWhiteboardContentTool } from './tools/update-whiteboard-content.tool';
import { WhiteboardAnalyzeTool } from './tools/whiteboard-analyze.tool';
import { WhiteboardListTool } from './tools/whiteboard-list.tool';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      McpApiKey,
      Whiteboard,
      InnovationPack,
      PlatformAuditEntry,
      CalloutContribution,
    ]),
    PassportModule,
    ActorContextModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    WhiteboardModule,
    CalloutModule,
    SpaceModule,
    CollaborationModule,
    SpaceLookupModule,
    ActivityModule,
    TemplateModule,
    SearchModule,
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
    AuditLogAnalyzeTool,
    CreateWhiteboardTool,
    UpdateWhiteboardContentTool,
    SearchContentTool,
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
    private readonly templateNavigatorTool: TemplateNavigatorTool,
    private readonly auditLogAnalyzeTool: AuditLogAnalyzeTool,
    private readonly createWhiteboardTool: CreateWhiteboardTool,
    private readonly updateWhiteboardContentTool: UpdateWhiteboardContentTool,
    private readonly searchContentTool: SearchContentTool
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
    this.toolRegistry.register(this.auditLogAnalyzeTool);
    this.toolRegistry.register(this.createWhiteboardTool);
    this.toolRegistry.register(this.updateWhiteboardContentTool);
    this.toolRegistry.register(this.searchContentTool);

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
