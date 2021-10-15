import { CommunicationMessageResult } from '@domain/common/communication/communication.dto.message.result';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixRoomResponseMessage } from '../adapter-room/matrix.room.dto.response.message';

@Injectable()
export class MatrixMessageAdapterService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  convertFromMatrixMessage(
    message: MatrixRoomResponseMessage,
    receiverMatrixID: string
  ): CommunicationMessageResult | undefined {
    const { event, sender } = message;
    if (event.type !== 'm.room.message') {
      return;
    }
    if (event.event_id?.indexOf(event.room_id || '') !== -1) {
      return;
    }
    // need to use getContent - should be able to resolve the edited value if any
    const content = message.getContent();
    if (!content.body) {
      return;
    }

    // these are used to detect whether a message is a replacement one
    // const isRelation = message.isRelation('m.replace');
    // const mRelatesTo = message.getWireContent()['m.relates_to'];

    return {
      message: content.body,
      senderID: sender.userId,
      timestamp: event.origin_server_ts || 0,
      id: event.event_id || '',
      receiverID: receiverMatrixID,
    };
  }
}
