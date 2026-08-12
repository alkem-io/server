import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { McpApiKeyService } from './auth/mcp-api-key.service';
import {
  IMcpApiKey,
  McpApiKeyMintResult,
  MintMcpApiKeyInput,
  RevokeMcpApiKeyInput,
  toGraphqlMcpApiKey,
} from './dto/mcp.api.key.dto';

/**
 * MCP API key lifecycle mutations for the CURRENT USER (workspace#038,
 * FR-001/FR-010/FR-011). Deliberately GraphQL-only: the MCP key strategy
 * lives ONLY in `McpAuthGuard`, applied ONLY to `McpServerController` — this
 * resolver is never reachable through it, which is the fix for the
 * key-chaining escalation (R-038-2, US3-AS1/AS2). Verified by
 * `mcp-api-key.resolver.mutations.spec.ts`.
 */
@InstrumentResolver()
@Resolver()
export class McpApiKeyResolverMutations {
  constructor(private readonly mcpApiKeyService: McpApiKeyService) {}

  @Mutation(() => McpApiKeyMintResult, {
    description:
      'Mint a new MCP API key for the current user. Returns the plaintext exactly once.',
  })
  async mintMcpApiKey(
    @CurrentActor() actorContext: ActorContext,
    @Args('mintData') input: MintMcpApiKeyInput
  ): Promise<McpApiKeyMintResult> {
    const userId = this.requireAuthenticatedUser(actorContext, 'mintMcpApiKey');

    const { entity, plaintext } = await this.mcpApiKeyService.mintApiKeyForUser(
      userId,
      {
        name: input.name,
        operations: input.operations,
        expiresAt: input.expiresAt,
      }
    );

    return {
      apiKey: plaintext,
      key: toGraphqlMcpApiKey(entity),
    };
  }

  @Mutation(() => IMcpApiKey, {
    description:
      "Revoke one of the current user's own MCP API keys. Idempotent.",
  })
  async revokeMcpApiKey(
    @CurrentActor() actorContext: ActorContext,
    @Args('revokeData') input: RevokeMcpApiKeyInput
  ): Promise<IMcpApiKey> {
    const userId = this.requireAuthenticatedUser(
      actorContext,
      'revokeMcpApiKey'
    );

    const revoked = await this.mcpApiKeyService.revokeOwnApiKey(
      input.keyID,
      userId
    );
    return toGraphqlMcpApiKey(revoked);
  }

  private requireAuthenticatedUser(
    actorContext: ActorContext,
    description: string
  ): string {
    if (!actorContext.actorID || actorContext.isAnonymous) {
      throw new ForbiddenException(
        'Caller must be an authenticated user for this operation.',
        LogContext.MCP_SERVER,
        { description }
      );
    }
    return actorContext.actorID;
  }
}
