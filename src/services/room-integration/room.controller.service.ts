import { LogContext } from '@common/enums';
import { MutationType } from '@common/enums/subscriptions';
import { RoomService } from '@domain/communication/room/room.service';
// import { VcInteractionService } from '@domain/communication/vc-interaction/vc.interaction.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { RoomDetails } from '@services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation';
import { InvokeEngineResponse } from '@services/infrastructure/event-bus/messages/invoke.engine.result';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class RoomControllerService {
  constructor(
    private roomService: RoomService,
    private subscriptionPublishService: SubscriptionPublishService,
    // private vcInteractionService: VcInteractionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async postReply(
    { roomID, threadID, communicationID }: RoomDetails,
    message: any //TODO type this properly with the implementation of the rest of the engines
    // vcInteractionID?: string
  ) {
    if (!threadID) {
      return;
    }
    const room = await this.roomService.getRoomOrFail(roomID);
    const answerMessage = await this.roomService.sendMessageReply(
      room,
      communicationID,
      {
        roomID: room.externalRoomID,
        message: this.convertResultToMessage(message),
        threadID,
      },
      'virtualContributor'
    );

    //TODO fix me with the openai assistant engine
    // if (vcInteractionID) {
    //   const vcInteraction =
    //     await this.vcInteractionService.getVcInteractionOrFail(vcInteractionID);
    //   if (!vcInteraction.externalMetadata.threadId && response.threadId) {
    //     vcInteraction.externalMetadata.threadId = response.threadId;
    //     await this.vcInteractionService.save(vcInteraction);
    //   }
    // }

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      answerMessage
    );
  }

  public async postMessage(
    { roomID, communicationID }: RoomDetails,
    response: InvokeEngineResponse
  ) {
    const room = await this.roomService.getRoomOrFail(roomID);
    const answerMessage = await this.roomService.sendMessage(
      room,
      communicationID,
      {
        roomID: room.externalRoomID,
        message: this.convertResultToMessage(response),
      }
    );

    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      answerMessage
    );
  }

  private convertResultToMessage(result: InvokeEngineResponse): string {
    this.logger.verbose?.(
      `Converting result to room message: ${JSON.stringify(result)}`,
      LogContext.COMMUNICATION
    );
    let answer = result.result;

    if (result.sources) {
      answer += '\n##### Sources:';
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
