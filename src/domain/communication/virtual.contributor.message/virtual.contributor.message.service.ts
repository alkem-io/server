import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { isInputValidForAction } from '@domain/community/virtual-contributor/dto/utils';
import {
  InvocationResultAction,
  VirtualContributorInvocationInput,
} from '@domain/community/virtual-contributor/dto/virtual.contributor.dto.invocation.input';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { AiServerAdapterInvocationInput } from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IRoom } from '../room/room.interface';
import { RoomLookupService } from '../room-lookup/room.lookup.service';

@Injectable()
export class VirtualContributorMessageService {
  constructor(
    private roomLookupService: RoomLookupService,
    private virtualActorLookupService: VirtualActorLookupService,
    private aiServerAdapter: AiServerAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async invokeVirtualContributor(
    virtualContributorActorID: string,
    message: string,
    threadID: string,
    actorContext: ActorContext,
    contextSpaceID: string,
    room: IRoom
  ) {
    const virtualContributor =
      await this.virtualActorLookupService.getVirtualContributorByIdOrFail(
        virtualContributorActorID
      );

    if (!virtualContributor.aiPersonaID) {
      throw new EntityNotInitializedException(
        `AI Persona ID not set for VirtualContributor ${virtualContributor?.id}`,
        LogContext.VIRTUAL
      );
    }

    const vcInput: VirtualContributorInvocationInput = {
      virtualContributorID: virtualContributor.id,
      message,
      contextSpaceID,
      userID: actorContext.actorID,
      resultHandler: {
        action: InvocationResultAction.POST_REPLY,
        roomDetails: {
          roomID: room.id,
          threadID,
          actorID: virtualContributorActorID,
        },
      },
    };

    await this.invoke(vcInput);
  }

  public async invoke(
    invocationInput: VirtualContributorInvocationInput
  ): Promise<void> {
    const virtualContributor =
      await this.virtualActorLookupService.getVirtualContributorByIdOrFail(
        invocationInput.virtualContributorID,
        {
          relations: {
            authorization: true,
            profile: true,
          },
        }
      );
    this.logger.verbose?.(
      `still need to use the context ${invocationInput.contextSpaceID}, ${invocationInput.userID}`,
      LogContext.AI_PERSONA_ENGINE
    );

    const aiServerAdapterInvocationInput: AiServerAdapterInvocationInput = {
      bodyOfKnowledgeID: virtualContributor.bodyOfKnowledgeID,
      aiPersonaID: virtualContributor.aiPersonaID,
      message: invocationInput.message,
      contextID: invocationInput.contextSpaceID,
      userID: invocationInput.userID,
      description: virtualContributor.profile.description,
      displayName: virtualContributor.profile.displayName,
      resultHandler: invocationInput.resultHandler,
    };

    // Get external metadata from room's JSON storage if this is a POST_REPLY action
    if (
      isInputValidForAction(invocationInput, InvocationResultAction.POST_REPLY)
    ) {
      const threadID = invocationInput.resultHandler.roomDetails!.threadID;
      const roomID = invocationInput.resultHandler.roomDetails!.roomID;

      // Get room to access vcInteractionsByThread
      const room = await this.roomLookupService.getRoomOrFail(roomID);
      const vcData = room.vcInteractionsByThread?.[threadID];

      if (vcData) {
        aiServerAdapterInvocationInput.externalMetadata = {
          threadId: vcData.externalThreadId,
        };
      }
    }

    const response = await this.aiServerAdapter.invoke(
      aiServerAdapterInvocationInput
    );
    return response;
  }
}
