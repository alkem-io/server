import { UserService } from '@domain/community/user/user.service';
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
    private userService: UserService,
    private readonly communicationPool: MatrixCommunicationPool
  ) {}

  async sendMsg(
    senderEmail: string,
    sendMsgData: CommunicationSendMessageInput
  ): Promise<string> {
    const { receiverID: receiverEmail, message } = sendMsgData;
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

    return roomID;
  }

  async getRooms(email: string): Promise<CommunicationRoomResult[]> {
    const communicationService = await this.communicationPool.acquire(email);
    const roomResponse = await communicationService.getRooms();
    return await Promise.all(
      roomResponse.map(rr =>
        this.bootstrapRoom(rr.roomID, rr.isDirect, rr.receiverEmail, [])
      )
    );
  }

  async getRoom(
    roomId: string,
    email: string
  ): Promise<CommunicationRoomDetailsResult> {
    const communicationService = await this.communicationPool.acquire(email);
    const {
      roomID,
      isDirect,
      receiverEmail,
      timeline,
    } = await communicationService.getRoom(roomId);

    const room = await this.bootstrapRoom(
      roomID,
      isDirect,
      receiverEmail,
      timeline
    );

    return room;
  }

  private async bootstrapRoom(
    roomId: string,
    isDirect: boolean,
    receiverEmail: string,
    messages: Array<{ event: any; sender: any }>
  ): Promise<CommunicationRoomDetailsResult> {
    const room = new CommunicationRoomDetailsResult();
    room.id = roomId;
    room.isDirect = isDirect;

    const receiver = await this.userService.getUserByEmail(receiverEmail);

    if (!receiver) {
      delete room.receiverID;
    } else {
      room.receiverID = `${receiver.id}`;
    }

    const senderEmails = [
      ...new Set(messages.map(m => MatrixTransforms.id2email(m.sender.name))),
    ];
    const users = await Promise.all(
      senderEmails.map(e => this.userService.getUserByEmail(e))
    );

    room.messages = [];

    for (const { event: ev, sender } of messages) {
      if (!ev.content?.body) {
        continue;
      }
      const user = users.find(
        u => u && u.email === MatrixTransforms.id2email(sender.name)
      );
      const roomMessage: CommunicationMessageResult = {
        message: ev.content.body,
        sender: user ? `${user.id}` : 'unknown',
        timestamp: ev.origin_server_ts,
      };

      room.messages.push(roomMessage);
    }

    return room;
  }
}
