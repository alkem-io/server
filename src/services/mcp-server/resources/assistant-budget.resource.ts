import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { User } from '@domain/community/user/user.entity';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import {
  MCP_CONSTANTS,
  McpReadResourceResult,
  McpResourceDefinition,
  McpResourceProvider,
} from '../dto/mcp.types';

/** The single, fixed URI for the assistant budget resource (no path params). */
const ASSISTANT_BUDGET_URI = `${MCP_CONSTANTS.URI_SCHEME}://assistant/budget`;

/**
 * 004-web-ai-assistant (FR-027b, Increment B) — the assistant BUDGET resource.
 *
 * An MCP **resource** (NOT a tool — it never appears in `tools/list`, carries no
 * capability-classification entry, and is never callable by the model) that lets
 * assistant-service learn the acting user's budget:
 *
 *   resources/read  uri: alkemio://assistant/budget
 *   → { accessEnabled: boolean, tokensPerMonth: number | null }
 *
 * Resolution is ALWAYS for the DELEGATED on-behalf-of user (the ActorContext's
 * `actorID` / `credentials` ARE the user's in Flow A), so user A's session can
 * never read user B's budget — the same delegation bound as every other MCP
 * surface.
 *
 *   - `accessEnabled` mirrors the §1 `ACCESS_VIRTUAL_ASSISTANT` authorization
 *     privilege resolved in the delegated context (defense-in-depth; the
 *     assistant edge already gated entry). Non-throwing ⇒ `false` when absent.
 *   - `tokensPerMonth` is the acting user's Account effective
 *     `ACCOUNT_AI_ASSISTANT_TOKENS_MONTH` LIMIT entitlement. `null` when no
 *     entitlement resolves (e.g. accountless edge cases) — the consumer falls
 *     back to `ASSISTANT_TOKENS_PER_MONTH_DEFAULT`.
 *
 * System-invoked (Flow B) work is out of scope: no user, no privilege/entitlement
 * — bounded by the existing per-caller budgets. A non-delegated/anonymous read
 * resolves `{ accessEnabled: false, tokensPerMonth: null }`.
 */
@Injectable()
export class AssistantBudgetResourceProvider implements McpResourceProvider {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly accountLookupService: AccountLookupService,
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getResourceDefinitions(): McpResourceDefinition[] {
    return [
      {
        uri: ASSISTANT_BUDGET_URI,
        name: 'Assistant budget',
        description:
          "The acting user's web AI assistant access flag and monthly weighted-token allowance (resolved for the delegated on-behalf-of user).",
        mimeType: 'application/json',
      },
    ];
  }

  matches(uri: string): boolean {
    return uri === ASSISTANT_BUDGET_URI;
  }

  /**
   * The budget resource is self-scoped to the acting (delegated) user — there is
   * no per-entity authorization. The generic read path checks READ against the
   * policy returned here; the Platform policy grants READ to any registered user,
   * so the gate passes and the access decision is the `ACCESS_VIRTUAL_ASSISTANT`
   * privilege resolved (non-throwing) inside `read()` as `accessEnabled`.
   */
  async getAuthorizationPolicy(_uri: string): Promise<IAuthorizationPolicy> {
    return this.platformAuthorizationService.getPlatformAuthorizationPolicy();
  }

  async read(
    uri: string,
    agentInfo: ActorContext
  ): Promise<McpReadResourceResult> {
    const accessEnabled = await this.resolveAccessEnabled(agentInfo);
    const tokensPerMonth = await this.resolveTokensPerMonth(agentInfo);

    this.logger.verbose?.(
      `Reading assistant budget resource for user: ${agentInfo.actorID || 'anonymous'} (accessEnabled=${accessEnabled}, tokensPerMonth=${tokensPerMonth})`,
      LogContext.MCP_SERVER
    );

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ accessEnabled, tokensPerMonth }),
        },
      ],
    };
  }

  /**
   * `accessEnabled` = the `ACCESS_VIRTUAL_ASSISTANT` privilege resolved against
   * the Platform authorization policy using the delegated user's credentials.
   * Non-throwing so an unprivileged user resolves `false` (defense-in-depth).
   */
  private async resolveAccessEnabled(
    agentInfo: ActorContext
  ): Promise<boolean> {
    if (agentInfo.isAnonymous || !agentInfo.actorID) {
      return false;
    }
    return this.authorizationService.isAccessGranted(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT
    );
  }

  /**
   * `tokensPerMonth` = the acting user's Account effective
   * `ACCOUNT_AI_ASSISTANT_TOKENS_MONTH` LIMIT entitlement. Resolved entirely
   * non-throwing: any missing link in user → account → license → entitlement
   * yields `null`, which the consumer maps to its config default.
   */
  private async resolveTokensPerMonth(
    agentInfo: ActorContext
  ): Promise<number | null> {
    if (agentInfo.isAnonymous || !agentInfo.actorID) {
      return null;
    }

    const user = await this.userRepository.findOne({
      where: { id: agentInfo.actorID },
    });
    if (!user?.accountID) {
      return null;
    }

    const account = await this.accountLookupService.getAccount(user.accountID, {
      relations: { license: { entitlements: true } },
    });
    const entitlement = account?.license?.entitlements?.find(
      e => e.type === LicenseEntitlementType.ACCOUNT_AI_ASSISTANT_TOKENS_MONTH
    );
    if (!entitlement) {
      return null;
    }
    return entitlement.limit;
  }
}
