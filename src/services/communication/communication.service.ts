import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixCommunicationPool } from '../matrix/communication/communication.matrix.pool';
import { MatrixTransforms } from '../matrix/user/user.matrix.service';
import { CommunicationMessageResult } from './communication.dto.message.result';
import { CommunicationRoomResult } from './communication.dto.room.result';
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
    const { receiverEmail, message } = sendMsgData;
    let { roomID } = sendMsgData;

    const communicationService = await this.communicationPool.acquire(
      senderEmail
    );

    if (!Boolean(roomID)) {
      roomID = await communicationService.messageUser({
        text: message,
        email: receiverEmail,
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
      room.messages = [];

      rr.timeline.forEach((m: any) => {
        const { event, sender } = m;
        if (event.content?.body) {
          const message = new CommunicationMessageResult();
          message.message = event.content.body;
          message.sender = MatrixTransforms.username2email(sender.name);
          room.messages.push(message);
        }
      });

      return room;
    });
  }
}
