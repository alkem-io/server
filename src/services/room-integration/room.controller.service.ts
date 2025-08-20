import { LogContext } from '@common/enums';
import { MutationType } from '@common/enums/subscriptions';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Post } from '@domain/collaboration/post/post.entity';
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

@Injectable()
export class RoomControllerService {
  constructor(
    private roomLookupService: RoomLookupService,
    private subscriptionPublishService: SubscriptionPublishService,
    private vcInteractionService: VcInteractionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getRoomEntityOrFail(
    roomID: string
    // undefined should not be needed bevause of the throw below but Typescript complains
  ): Promise<Callout | Post | undefined> {
    const room = await this.roomLookupService.getRoomOrFail(roomID, {
      relations: {
        callout: { framing: { profile: true } },
        post: { profile: true },
      },
    });
    if (!room.callout && !room.post) {
      this.logger.error(
        `Room with ID ${roomID} does not have a callout or post.`,
        LogContext.COMMUNICATION
      );
      throw new Error(
        `Room with ID ${roomID} does not have a callout or post.`
      );
    }

    return room.callout || room.post;
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
    const { roomID, threadID, communicationID, vcInteractionID }: RoomDetails =
      event.original.resultHandler.roomDetails!;

    if (!threadID) {
      return;
    }
    const room = await this.roomLookupService.getRoomOrFail(roomID);
    const answerMessage = await this.roomLookupService.sendMessageReply(
      room,
      communicationID,
      {
        roomID: room.externalRoomID,
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
    const { roomID, communicationID }: RoomDetails =
      event.original.resultHandler.roomDetails!;
    const response: InvokeEngineResponse = event.response;
    const room = await this.roomLookupService.getRoomOrFail(roomID);
    const answerMessage = await this.roomLookupService.sendMessage(
      room,
      communicationID,
      {
        roomID: room.externalRoomID,
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
