import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Room } from '../room/room.entity';
import { UUID_LENGTH } from '@common/constants';

@Entity()
export class Communication
  extends AuthorizableEntity
  implements ICommunication
{
  @Column('varchar', { nullable: false, length: UUID_LENGTH })
  spaceID: string;

  @Index('FK_777750fa78a37776ad962cb7643')
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
