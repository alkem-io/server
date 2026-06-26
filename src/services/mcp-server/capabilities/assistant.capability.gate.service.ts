import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { User } from '@domain/community/user/user.entity';
import { IAssistantCapabilityToggle } from '@domain/community/virtual-assistant/dto/assistant.capability.toggle.interface';
import { VirtualAssistantService } from '@domain/community/virtual-assistant/virtual.assistant.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

/** Refusal reason surfaced to assistant-service when a capability is gated off. */
export const CAPABILITY_DISABLED_REASON = 'capability_disabled';

/**
 * The per-tool capability gate (FR-018/FR-019). This is an ADDITIONAL check
 * layered ON TOP of the AuthorizationService per-entity authorization — it never
 * widens access (the user/actor authorization already bounds that), it only
 * narrows it to the granted subset, re-evaluated at action time.
 *
 *   - DELEGATED call (Flow A, user-initiated): `onBehalfOfUserId` is set; the
 *     tool must be enabled in that user's `settings.assistant.enabledCapabilities`.
 *   - SYSTEM-INVOKED call (Flow B, actor): `onBehalfOfUserId` is null; the tool
 *     must be enabled in the assistant ACTOR's admin `capabilityGrant` (T030 /
 *     FR-019). Default read-only.
 *   - Non-assistant calls (a direct api-key/JWT caller that is not the
 *     assistant, i.e. no `delegationContext`) are NOT gated here — they are
 *     bounded solely by the existing AuthorizationService, as before.
 */
@Injectable()
export class AssistantCapabilityGateService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly virtualAssistantService: VirtualAssistantService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * @returns `null` if the tool is allowed by the gate (or the gate does not
   * apply to this caller); otherwise a refusal reason string.
   */
  async checkToolAllowed(
    toolName: string,
    actorContext: ActorContext
  ): Promise<string | null> {
    const delegation = actorContext.delegationContext;
    if (!delegation) {
      // Not an assistant call — no per-tool gate applies here.
      return null;
    }

    // Flow A (delegated): gate against the on-behalf-of USER's grant.
    // Flow B (system-invoked, onBehalfOfUserId === null): gate against the
    // assistant ACTOR's admin grant (FR-019).
    const enabled =
      delegation.onBehalfOfUserId !== null
        ? await this.isToolEnabledForUser(delegation.onBehalfOfUserId, toolName)
        : await this.isToolEnabledForActor(
            delegation.assistantActorId,
            toolName
          );

    if (!enabled) {
      this.logger.verbose?.(
        `Capability gate refused tool '${toolName}' (assistant ${delegation.assistantActorId}, onBehalfOf ${delegation.onBehalfOfUserId ?? 'system-invoked'})`,
        LogContext.MCP_SERVER
      );
      return CAPABILITY_DISABLED_REASON;
    }
    return null;
  }

  /**
   * A capability is enabled iff it appears in the user's grant with
   * `enabled: true`. Absence ⇒ disabled (so a new WRITE capability the user has
   * never seen is off by default). Re-read each call — no cached stale grant.
   */
  private async isToolEnabledForUser(
    userId: string,
    toolName: string
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { settings: true },
    });
    const toggles = user?.settings?.assistant?.enabledCapabilities ?? [];
    return this.isEnabled(toggles, toolName);
  }

  /**
   * Flow B (system-invoked): a capability is enabled iff it appears in the
   * assistant actor's admin `capabilityGrant` with `enabled: true`. Absence ⇒
   * disabled (read-only default). Re-read each call — no cached stale grant.
   */
  private async isToolEnabledForActor(
    assistantActorId: string,
    toolName: string
  ): Promise<boolean> {
    const virtualAssistant =
      await this.virtualAssistantService.getVirtualAssistantOrFail(
        assistantActorId
      );
    return this.isEnabled(virtualAssistant.capabilityGrant ?? [], toolName);
  }

  private isEnabled(
    toggles: IAssistantCapabilityToggle[],
    toolName: string
  ): boolean {
    return toggles.some(
      toggle => toggle.capability === toolName && toggle.enabled === true
    );
  }
}
