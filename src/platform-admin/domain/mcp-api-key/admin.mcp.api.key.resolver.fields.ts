import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { McpApiKeyService } from '@services/mcp-server/auth/mcp-api-key.service';
import {
  IMcpApiKey,
  toGraphqlMcpApiKey,
} from '@services/mcp-server/dto/mcp.api.key.dto';
import { CurrentActor } from '@src/common/decorators';
import { PlatformAdminQueryResults } from '@src/platform-admin/admin/dto/platform.admin.query.results';

/**
 * MCP API key admin surface (workspace#038, FR-017/FR-018/FR-020). API-only —
 * NO admin UI in this delivery. Every read/write here is scoped to a NAMED
 * `userID` and predicated on `userId IS NOT NULL` at the service layer
 * (`McpApiKeyService.listUserKeysForAdmin` / `.adminRevokeApiKey`), so an
 * actor-bound trust-anchor key (e.g. the `virtual-assistant` bootstrap key,
 * `ensureActorKeyFromPlaintext`) is unreachable from this resolver by
 * construction (ruling A9). Verified by
 * `admin.mcp.api.key.resolver.fields.spec.ts` (US3-AS6).
 *
 * This resolver — like every other GraphQL surface — is never reachable
 * through `McpAuthGuard`: that guard is applied ONLY to `McpServerController`
 * (grep-verified, R-08). An `mcp_` key therefore has zero admin lifecycle
 * reach, same as it has zero self-service reach (R-038-2 closure).
 */
@Resolver(() => PlatformAdminQueryResults)
export class AdminMcpApiKeyResolverFields {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly mcpApiKeyService: McpApiKeyService
  ) {}

  @ResolveField('mcpApiKeys', () => [IMcpApiKey], {
    nullable: false,
    description:
      'MCP API keys belonging to the named user. Platform admins only. Keys bound to a system actor are never returned.',
  })
  async mcpApiKeys(
    @CurrentActor() actorContext: ActorContext,
    @Args('userID', { type: () => UUID }) userID: string
  ): Promise<IMcpApiKey[]> {
    await this.assertPlatformAdmin(
      actorContext,
      `platformAdmin mcpApiKeys subject=${userID}`
    );
    const rows = await this.mcpApiKeyService.listUserKeysForAdmin(userID);
    return rows.map(toGraphqlMcpApiKey);
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
