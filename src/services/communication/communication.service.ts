import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixCommunicationPool } from '../matrix/communication/communication.matrix.pool';
import { MatrixTransforms } from '../matrix/user/user.matrix.service';
import { CommunicationMessageResult } from './communication.dto.message.result';
import {
  CommunicationRoomResult,
  CommunicationRoomDetailsResult,
} from './communication.dto.room.result';
import { CommunicationSendMessageInput } from './communication.dto.send.msg';

@Injectable()
export class CommunicationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly communicationPool: MatrixCommunicationPool
  ) {}

  async sendMsg(
    senderEmail: string,
    sendMsgData: CommunicationSendMessageInput
  ): Promise<void> {
    const { receiverID, message } = sendMsgData;
    let { roomID } = sendMsgData;

    const communicationService = await this.communicationPool.acquire(
      senderEmail
    );

    if (!Boolean(roomID)) {
      roomID = await communicationService.messageUser({
        text: message,
        email: receiverID,
      });
    } else {
      await communicationService.message(roomID, { text: message });
    }
  }

  async getRooms(email: string): Promise<CommunicationRoomResult[]> {
    const communicationService = await this.communicationPool.acquire(email);
    const roomResponse = await communicationService.getRooms();
    return roomResponse.map(rr => {
      const room = new CommunicationRoomResult();
      room.id = rr.roomId;

      return room;
    });
  }

  async getRoom(
    roomId: string,
    email: string
  ): Promise<CommunicationRoomDetailsResult> {
    const communicationService = await this.communicationPool.acquire(email);
    const roomResponse = await communicationService.getRoom(roomId);
    const room = new CommunicationRoomDetailsResult();
    room.id = roomResponse.roomId;
    room.messages = [];

    roomResponse.timeline.map((m: any) => {
      const { event, sender } = m;
      if (event.content?.body) {
        const message = new CommunicationMessageResult();
        message.message = event.content.body;
        //TODO [ATS]: replace email with db ID.
        message.sender = MatrixTransforms.username2email(sender.name);
        room.messages.push(message);
      }
    });

    return room;
  }
}
