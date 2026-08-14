import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { McpApiKeyService } from '@services/mcp-server/auth/mcp-api-key.service';
import {
  AdminRevokeMcpApiKeyInput,
  IMcpApiKey,
  toGraphqlMcpApiKey,
} from '@services/mcp-server/dto/mcp.api.key.dto';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';

/**
 * Admin MCP API key revoke (workspace#038, FR-017/FR-018/FR-020). See
 * `admin.mcp.api.key.resolver.fields.ts` for the containment rationale — same
 * `userId IS NOT NULL` firewall applies here via
 * `McpApiKeyService.adminRevokeApiKey`.
 */
@InstrumentResolver()
@Resolver()
export class AdminMcpApiKeyResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly mcpApiKeyService: McpApiKeyService
  ) {}

  @Mutation(() => IMcpApiKey, {
    description:
      "Platform admin: revoke a named user's MCP API key. Idempotent.",
  })
  async adminRevokeMcpApiKey(
    @CurrentActor() actorContext: ActorContext,
    @Args('revokeData') input: AdminRevokeMcpApiKeyInput
  ): Promise<IMcpApiKey> {
    // Static description — see the note in admin.mcp.api.key.resolver.fields.ts.
    await this.assertPlatformAdmin(actorContext, 'adminRevokeMcpApiKey');
    const revoked = await this.mcpApiKeyService.adminRevokeApiKey(
      input.keyID,
      input.userID,
      actorContext.actorID
    );
    return toGraphqlMcpApiKey(revoked);
  }

  private async assertPlatformAdmin(
    actorContext: ActorContext,
    description: string
  ): Promise<void> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      description
    );
  }
}
