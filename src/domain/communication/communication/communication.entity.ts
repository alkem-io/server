import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Discussion } from '../discussion/discussion.entity';
import { Updates } from '../updates/updates.entity';

@Entity()
export class Communication
  extends AuthorizableEntity
  implements ICommunication
{
  @Column()
  ecoverseID: string;

  @OneToMany(() => Discussion, discussion => discussion.communication, {
    eager: true,
    cascade: true,
  })
  discussions?: Discussion[];

  @OneToOne(() => Updates, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  updates?: Updates;

  @Column()
  communicationGroupID!: string;

  @Column()
  displayName!: string;

  constructor(displayName: string) {
    super();
    this.ecoverseID = '';
    this.communicationGroupID = '';
    this.displayName = displayName || '';
  }
}
