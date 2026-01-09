import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Room } from '../room/room.entity';

@Entity()
export class Communication
  extends AuthorizableEntity
  implements ICommunication
{
  @Column('uuid', { nullable: true })
  spaceID?: string;

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
    this.displayName = displayName || '';
  }
}
