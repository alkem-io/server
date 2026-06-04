import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { GrantAssistantActorCapabilitiesInput } from './dto/grant.assistant.actor.capabilities.input';
import { IVirtualAssistant } from './virtual.assistant.interface';
import { VirtualAssistantService } from './virtual.assistant.service';

/**
 * Admin mutations on the `virtual-assistant` actor.
 *
 * `updateAssistantActorCapabilities` sets the admin per-capability grant
 * governing SYSTEM-INVOKED authority (Flow B / FR-019). It is PLATFORM_ADMIN-
 * gated and persists `capabilityGrant`; the default (seeded by the migration)
 * is READ-ONLY, so content-changing capabilities are usable system-invoked only
 * where an admin explicitly enables them here. This does NOT affect
 * user-initiated work (that uses the user's own grant on UserSettings.assistant).
 * See contracts/assistant-authority.md §3.
 */
@InstrumentResolver()
@Resolver()
export class VirtualAssistantResolverMutations {
  constructor(
    private readonly virtualAssistantService: VirtualAssistantService,
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Mutation(() => IVirtualAssistant, {
    description:
      'Set the admin per-capability grant on the virtual-assistant actor, governing what it may do system-invoked (default read-only). Requires platform-admin.',
  })
  async updateAssistantActorCapabilities(
    @CurrentActor() actorContext: ActorContext,
    @Args('grantData') grantData: GrantAssistantActorCapabilitiesInput
  ): Promise<IVirtualAssistant> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'updating the virtual-assistant admin capability grant'
    );

    return this.virtualAssistantService.setCapabilityGrant(
      grantData.virtualAssistantID,
      grantData.enabledCapabilities
    );
  }
}
