import { Column, Entity, OneToMany } from 'typeorm';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Discussion } from '../discussion/discussion.entity';

@Entity()
export class Communication
  extends AuthorizableEntity
  implements ICommunication
{
  @Column()
  ecoverseID: string;

  @Column()
  displayName!: string;

  @OneToMany(() => Discussion, discussion => discussion.communication, {
    eager: true,
    cascade: true,
  })
  discussions?: Discussion[];

  @Column()
  updatesRoomID!: string;

  @Column()
  communicationGroupID!: string;

  constructor() {
    super();
    this.ecoverseID = '';
    this.updatesRoomID = '';
  }
}
