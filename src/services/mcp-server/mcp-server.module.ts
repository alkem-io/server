import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { MicroservicesModule } from '@core/microservices/microservices.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { User } from '@domain/community/user/user.entity';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { VirtualAssistantModule } from '@domain/community/virtual-assistant/virtual.assistant.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@platform/activity/activity.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { SearchModule } from '@services/api/search/search.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { McpApiKey } from './auth/mcp-api-key.entity';
import { McpApiKeyService } from './auth/mcp-api-key.service';
import { McpApiKeyStrategy } from './auth/mcp-api-key.strategy';
import { McpAuthGuard } from './auth/mcp-auth.guard';
import { McpDelegationStrategy } from './auth/mcp-delegation.strategy';
import { AssistantCapabilityGateService } from './capabilities/assistant.capability.gate.service';
import { AssistantCapabilityResolverQueries } from './capabilities/assistant.capability.resolver.queries';
import {
  MCP_RESOURCE_PROVIDER,
  MCP_TOOL,
  McpResourceProvider,
  McpTool,
} from './dto/mcp.types';
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

/**
 * Single source of truth for the MCP tool set. Each entry is registered as a
 * provider AND injected into the MCP_TOOL aggregator factory below — so adding
 * a tool is a one-line edit here, with no register() call or constructor wiring
 * to keep in sync.
 */
const TOOL_PROVIDERS = [
  WhiteboardAnalyzeTool,
  WhiteboardListTool,
  ContributionsAnalyzeTool,
  CommunityActivitySummaryTool,
  TemplateNavigatorTool,
  AuditLogAnalyzeTool,
  CreateWhiteboardTool,
  UpdateWhiteboardContentTool,
  SearchContentTool,
];

/** Single source of truth for the MCP resource providers (see TOOL_PROVIDERS). */
const RESOURCE_PROVIDERS = [
  WhiteboardResourceProvider,
  CalloutResourceProvider,
  SpaceResourceProvider,
];

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      McpApiKey,
      Whiteboard,
      InnovationPack,
      PlatformAuditEntry,
      CalloutContribution,
      User,
    ]),
    PassportModule,
    ActorContextModule,
    AuthenticationModule,
    AuthorizationModule,
    MicroservicesModule,
    VirtualAssistantModule,
    PlatformAuthorizationPolicyModule,
    WhiteboardModule,
    CalloutModule,
    SpaceModule,
    CollaborationModule,
    SpaceLookupModule,
    ActivityModule,
    TemplateModule,
    SearchModule,
    UrlGeneratorModule,
  ],
  controllers: [McpServerController],
  providers: [
    McpServerService,
    McpApiKeyService,
    McpApiKeyStrategy,
    McpDelegationStrategy,
    McpAuthGuard,
    // Assistant capability surface: dynamic enumeration + per-tool gate.
    AssistantCapabilityResolverQueries,
    AssistantCapabilityGateService,
    // Registries — the single source of truth the MCP service reads from.
    ResourceRegistry,
    ToolRegistry,
    // Tools + resource providers as injectable providers.
    ...TOOL_PROVIDERS,
    ...RESOURCE_PROVIDERS,
    // Aggregator providers: collect the instances into arrays the registries
    // inject (NestJS has no multi-provider, so we fan them in via useFactory).
    {
      provide: MCP_TOOL,
      useFactory: (...tools: McpTool[]) => tools,
      inject: TOOL_PROVIDERS,
    },
    {
      provide: MCP_RESOURCE_PROVIDER,
      useFactory: (...providers: McpResourceProvider[]) => providers,
      inject: RESOURCE_PROVIDERS,
    },
  ],
  exports: [McpServerService, McpApiKeyService],
})
export class McpServerModule {}
