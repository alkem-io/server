import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { Room } from '../room/room.entity';

export class Communication
  extends AuthorizableEntity
  implements ICommunication
{
  spaceID: string;

  updates!: Room;

  displayName!: string;

  constructor(displayName: string) {
    super();
    this.spaceID = '';
    this.displayName = displayName || '';
  }
}
