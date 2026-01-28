import { UUID_LENGTH } from '@common/constants';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Room } from '../room/room.entity';

@Entity()
export class Communication
  extends AuthorizableEntity
  implements ICommunication
{
  @Column('varchar', { nullable: false, length: UUID_LENGTH })
  spaceID: string;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  updates!: Room;

  @Column()
  displayName!: string;

  constructor(displayName: string) {
    super();
    this.spaceID = '';
    this.displayName = displayName || '';
  }
}
