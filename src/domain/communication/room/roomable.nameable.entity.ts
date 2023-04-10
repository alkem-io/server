import { Column } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { IRoomableNameable } from './roomable.nameable.interface';

export abstract class RoomableNameableEntity
  extends NameableEntity
  implements IRoomableNameable
{
  constructor() {
    super();
    this.communicationRoomID = '';
    this.communicationGroupID = '';
    this.displayName = '';
  }

  @Column()
  communicationRoomID!: string;

  @Column()
  communicationGroupID!: string;

  @Column()
  displayName!: string;
}
