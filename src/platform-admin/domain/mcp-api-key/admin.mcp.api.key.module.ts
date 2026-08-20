import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { McpServerModule } from '@services/mcp-server/mcp-server.module';
import { AdminMcpApiKeyResolverFields } from './admin.mcp.api.key.resolver.fields';
import { AdminMcpApiKeyResolverMutations } from './admin.mcp.api.key.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    McpServerModule,
  ],
  providers: [AdminMcpApiKeyResolverMutations, AdminMcpApiKeyResolverFields],
  exports: [],
})
export class AdminMcpApiKeyModule {}
