import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import {
  InvocationResultAction,
  VirtualContributorInvocationInput,
} from '@domain/community/virtual-contributor/dto/virtual.contributor.dto.invocation.input';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IRoom } from '../room/room.interface';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { isInputValidForAction } from '@domain/community/virtual-contributor/dto/utils';
import { AiServerAdapterInvocationInput } from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation';
import { VcInteractionService } from '../vc-interaction/vc.interaction.service';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';

@Injectable()
export class VirtualContributorMessageService {
  constructor(
    private vcInteractionService: VcInteractionService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private aiServerAdapter: AiServerAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async invokeVirtualContributor(
    virtualContributorID: string,
    message: string,
    threadID: string,
    agentInfo: AgentInfo,
    contextSpaceID: string,
    room: IRoom,
    vcInteraction: IVcInteraction | undefined = undefined
  ) {
    const virtualContributor =
      await this.virtualContributorLookupService.getVirtualContributorOrFail(
        virtualContributorID,
        {
          relations: {
            aiPersona: true,
          },
        }
      );

    const virtualPersona = virtualContributor?.aiPersona;

    if (!virtualPersona) {
      throw new EntityNotInitializedException(
        `VirtualPersona not loaded for VirtualContributor ${virtualContributor?.id}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
    }

    const vcInput: VirtualContributorInvocationInput = {
      virtualContributorID: virtualContributor.id,
      message,
      contextSpaceID,
      userID: agentInfo.userID,
      resultHandler: {
        action: InvocationResultAction.POST_REPLY,
        roomDetails: {
          roomID: room.id,
          threadID,
          communicationID: virtualContributor.communicationID,
          vcInteractionID: vcInteraction?.id,
        },
      },
    };

    await this.invoke(vcInput);
  }

  public async invoke(
    invocationInput: VirtualContributorInvocationInput
  ): Promise<void> {
    const virtualContributor =
      await this.virtualContributorLookupService.getVirtualContributorOrFail(
        invocationInput.virtualContributorID,
        {
          relations: {
            authorization: true,
            aiPersona: true,
            agent: true,
            profile: true,
          },
        }
      );
    if (!virtualContributor.agent) {
      throw new EntityNotInitializedException(
        `Virtual Contributor Agent not initialized: ${invocationInput.virtualContributorID}`,
        LogContext.AUTH
      );
    }

    this.logger.verbose?.(
      `still need to use the context ${invocationInput.contextSpaceID}, ${invocationInput.userID}`,
      LogContext.AI_PERSONA_SERVICE_ENGINE
    );

    const aiServerAdapterInvocationInput: AiServerAdapterInvocationInput = {
      aiPersonaServiceID: virtualContributor.aiPersona.aiPersonaServiceID,
      message: invocationInput.message,
      contextID: invocationInput.contextSpaceID,
      userID: invocationInput.userID,
      description: virtualContributor.profile.description,
      displayName: virtualContributor.profile.displayName,
      resultHandler: invocationInput.resultHandler,
    };

    if (
      isInputValidForAction(invocationInput, InvocationResultAction.POST_REPLY)
    ) {
      const vcInteraction =
        await this.vcInteractionService.getVcInteractionOrFail(
          invocationInput.resultHandler.roomDetails!.vcInteractionID!
        );

      aiServerAdapterInvocationInput.vcInteractionID = vcInteraction.id;
      aiServerAdapterInvocationInput.externalMetadata =
        vcInteraction.externalMetadata;
    }

    const response = await this.aiServerAdapter.invoke(
      aiServerAdapterInvocationInput
    );
    return response;
  }
}
