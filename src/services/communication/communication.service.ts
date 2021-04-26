import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixCommunicationPool } from '../matrix/communication/communication.matrix.pool';
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
    sendMsgData: CommunicationSendMessageInput
  ): Promise<CommunicationRoomResult> {
    const room = new CommunicationRoomResult();
    room.messages = [];
    const newMsg = new CommunicationMessageResult();
    newMsg.message = sendMsgData.message;
    room.messages.push(newMsg);

    return room;
  }

  async getRooms(matrixID: string): Promise<CommunicationRoomResult[]> {
    this.logger.log(matrixID);
    const communicationService = await this.communicationPool.acquire(matrixID);
    this.logger.log(await communicationService.getRooms());
    return [];
  }
}
