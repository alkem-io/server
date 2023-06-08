import { Column, Entity } from 'typeorm';
import { IRoom } from './room.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { RoomType } from '@common/enums/room.type';

@Entity()
export class Room extends AuthorizableEntity implements IRoom {
  @Column()
  externalRoomID!: string;

  @Column('int', { nullable: false })
  messagesCount!: number;

  @Column('text', { nullable: false })
  type!: string;

  @Column()
  displayName!: string;

  constructor(displayName: string, type: RoomType) {
    super();
    this.type = type;
    this.displayName = displayName;
    this.messagesCount = 0;
  }
}
