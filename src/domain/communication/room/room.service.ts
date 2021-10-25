import { Injectable } from '@nestjs/common';
import { IdentityResolverService } from '../identity-resolver/identity.resolver.service';
import { CommunicationRoomResult } from './communication.dto.room.result';

@Injectable()
export class RoomService {
  constructor(private identityResolverService: IdentityResolverService) {}

  // Convert from Matrix ID to Alkemio User ID
  async populateRoomMessageSenders(
    rooms: CommunicationRoomResult[]
  ): Promise<CommunicationRoomResult[]> {
    const knownSendersMap = new Map();
    for (const room of rooms) {
      for (const message of room.messages) {
        const matrixUserID = message.sender;
        let alkemioUserID = knownSendersMap.get(matrixUserID);
        if (!alkemioUserID) {
          alkemioUserID =
            await this.identityResolverService.getUserIDByCommunicationsID(
              matrixUserID
            );
          knownSendersMap.set(matrixUserID, alkemioUserID);
        }
        message.sender = alkemioUserID;
      }
    }

    return rooms;
  }
}
