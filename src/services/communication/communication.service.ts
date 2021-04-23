import { Inject, LoggerService, NotImplementedException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunicationMessageResult } from './communication.dto.message.result';
import { CommunicationRoomResult } from './communication.dto.room.result';
import { CommunicationSendMessageInput } from './communication.dto.send.msg';

export class CommunicationService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async sendMsg(
    sendMsgData: CommunicationSendMessageInput
  ): Promise<CommunicationRoomResult> {
    const room = new CommunicationRoomResult();
    room.messages = [];
    const newMsg = new CommunicationMessageResult();
    newMsg.message = sendMsgData.message;
    room.messages.push(newMsg);

    return room;
  }

  async getRooms(userID: string): Promise<CommunicationRoomResult[]> {
    throw new NotImplementedException(`Not yet implemented: ${userID}`);
  }
}
