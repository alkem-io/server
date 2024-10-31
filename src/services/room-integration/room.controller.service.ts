import { MutationType } from '@common/enums/subscriptions';
import { RoomService } from '@domain/communication/room/room.service';
import { Injectable } from '@nestjs/common';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';

@Injectable()
export class RoomControllerService {
  constructor(
    private roomService: RoomService,
    private subscriptionPublishService: SubscriptionPublishService
  ) {}

  public async postReply(
    roomID: string,
    threadID: string,
    communctionID: string,
    message: string
  ) {
    const room = await this.roomService.getRoomOrFail(roomID);
    const answerMessage = await this.roomService.sendMessageReply(
      room,

      communctionID,
      { roomID: room.externalRoomID, message, threadID },
      'virtualContributor'
    );
    this.subscriptionPublishService.publishRoomEvent(
      room,
      MutationType.CREATE,
      answerMessage
    );
  }
}
