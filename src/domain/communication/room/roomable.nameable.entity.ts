import { Column } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { IRoomableNameable } from './roomable.nameable.interface';

export abstract class RoomableNameableEntity
  extends NameableEntity
  implements IRoomableNameable
{
  constructor(communicationGroupID: string, displayName: string) {
    super();
    this.communicationRoomID = '';
    this.communicationGroupID = communicationGroupID || '';
    this.displayName = displayName || '';
  }

  @Column()
  communicationRoomID!: string;

  @Column()
  communicationGroupID!: string;

  @Column()
  displayName!: string;
}
