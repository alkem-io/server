import { LogContext } from '@common/enums';
import { MutationType } from '@common/enums/subscriptions';
import { Post } from '@domain/collaboration/post/post.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { RoomLookupService } from '@domain/communication/room-lookup/room.lookup.service';
import { VcInteractionService } from '@domain/communication/vc-interaction/vc.interaction.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { RoomDetails } from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation';
import {
  InvokeEngineResponse,
  InvokeEngineResult,
} from '@services/infrastructure/event-bus/messages/invoke.engine.result';

import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class RoomControllerService {
  constructor(
    private roomLookupService: RoomLookupService,
    private subscriptionPublishService: SubscriptionPublishService,
    private vcInteractionService: VcInteractionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /**
   * Retrieves the Callout or Post entity associated with the given room ID.
   * Throws EntityNotFoundException if neither entity is found.
   *
   * @param {string} roomID - The unique identifier of the room.
   * @returns {Promise<Callout | Post>} The associated Callout or Post entity.
   * @throws {EntityNotFoundException} If the room does not have a callout or post.
   */
  public async getRoomEntityOrFail(roomID: string): Promise<Callout | Post> {
    const room = await this.roomLookupService.getRoomOrFail(roomID, {
      relations: {
        callout: { framing: { profile: true } },
        post: { profile: true },
      },
    });
    const entity = room.callout || room.post;
    if (!entity) {
      throw new EntityNotFoundException(
        'Room with ID does not have a callout or post.',
        LogContext.COMMUNICATION,
        { roomID }
      );
    }
    return entity;
  }

  public async getMessages(roomID: string) {
    const room = await this.getRoomOrFail(roomID);
    return await this.roomLookupService.getMessages(room);
  }

  public async getMessagesInThread(roomID: string, threadID: string) {
    const room = await this.getRoomOrFail(roomID);
    return await this.roomLookupService.getMessagesInThread(room, threadID);
  }

  private async getRoomOrFail(roomID: string) {
    return this.roomLookupService.getRoomOrFail(roomID);
  }

  public async postReply(event: InvokeEngineResult) {
    const { roomID, threadID, actorId, vcInteractionID }: RoomDetails =
      event.original.resultHandler.roomDetails!;

    if (!threadID) {
      return;
    }
    const room = await this.roomLookupService.getRoomOrFail(roomID);
    const answerMessage = await this.roomLookupService.sendMessageReply(
      room,
      actorId,
      {
        roomID: room.id,
        message: this.convertResultToMessage(event.response),
        threadID,
      },
      'virtualContributor'
    );

    const externalThreadId = event.response.threadId;

    if (vcInteractionID && externalThreadId) {
      const vcInteraction =
        await this.vcInteractionService.getVcInteractionOrFail(vcInteractionID);
      if (!vcInteraction.externalMetadata.threadId) {
        vcInteraction.externalMetadata.threadId = externalThreadId;
        await this.vcInteractionService.save(vcInteraction);
      }
    }

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      answerMessage
    );
  }

  public async postMessage(event: InvokeEngineResult) {
    const { roomID, actorId }: RoomDetails =
      event.original.resultHandler.roomDetails!;
    const response: InvokeEngineResponse = event.response;
    const room = await this.roomLookupService.getRoomOrFail(roomID);
    const answerMessage = await this.roomLookupService.sendMessage(
      room,
      actorId,
      {
        roomID: room.id,
        // this second argument (sourcesLable = true) should be part of the resultHandler and not hardcoded here
        message: this.convertResultToMessage(response, true),
      }
    );

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      answerMessage
    );
  }

  private convertResultToMessage(
    result: InvokeEngineResponse,
    sourcesLabel = false
  ): string {
    this.logger.verbose?.(
      `Converting result to room message: ${JSON.stringify(result)}`,
      LogContext.COMMUNICATION
    );
    let answer = result.result;

    if (result.sources) {
      answer += sourcesLabel ? '\n##### Sources:' : '';
      answer +=
        '\n' +
        result.sources
          .map(
            ({ title, uri }: { title: string; uri: string }) =>
              `- [${title || uri}](${uri})`
          )
          .join('\n');
    }
    return answer;
  }
}
