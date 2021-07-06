import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { ICommunity } from '@domain/community/community/community.interface';
import { IApplication } from '@domain/community/application/application.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Credential } from '@domain/agent/credential/credential.entity';
import { Application } from '@domain/community/application/application.entity';

@Entity()
export class Community extends AuthorizableEntity
  implements ICommunity, IGroupable {
  @Column()
  displayName: string;

  @Column()
  ecoverseID: string;

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.community,
    { eager: true, cascade: true }
  )
  groups?: UserGroup[];

  @OneToMany(
    () => Application,
    application => application.community,
    { eager: true, cascade: true }
  )
  applications?: IApplication[];

  // The credential profile  that is used for determining membership of this community
  @OneToOne(() => Credential, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  credential!: Credential;

  // The parent community can have many child communities; the relationship is controlled by the child.
  @ManyToOne(() => Community, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  parentCommunity?: Community;

  @Column()
  updatesRoomID!: string;

  @Column()
  discussionRoomID!: string;

  @Column()
  communicationGroupID: string;

  constructor(name: string) {
    super();
    this.displayName = name;
    this.ecoverseID = '';
    this.updatesRoomID = '';
    this.discussionRoomID = '';
    this.communicationGroupID = '';
  }
}
