import { Column } from 'typeorm';
import { IRoomable } from './roomable.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';

export abstract class RoomableEntity
  extends AuthorizableEntity
  implements IRoomable
{
  constructor(displayName: string) {
    super();
    this.communicationRoomID = '';
    this.displayName = displayName || '';
  }

  @Column()
  communicationRoomID!: string;

  @Column()
  displayName!: string;
}
