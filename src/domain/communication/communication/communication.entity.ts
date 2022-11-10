import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Updates } from '@domain/communication/updates/updates.entity';

@Entity()
export class Communication
  extends AuthorizableEntity
  implements ICommunication
{
  @Column()
  hubID: string;

  @OneToMany(() => Discussion, discussion => discussion.communication, {
    eager: false,
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
    this.hubID = '';
    this.communicationGroupID = '';
    this.displayName = displayName || '';
  }
}
