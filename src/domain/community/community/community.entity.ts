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
import { ICommunity } from '@domain/community/community';
import { Challenge } from '@domain/challenge/challenge';
import { Application, IApplication } from '@domain/community/application';
import { Opportunity } from '@domain/collaboration/opportunity';
import { AuthorizableEntity } from '@domain/common/authorizable-entity';
import { Credential } from '@domain/agent/credential';

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

  @OneToOne(
    () => Challenge,
    challenge => challenge.community,
    { eager: false, cascade: false }
  )
  challenge?: Challenge;

  @OneToOne(
    () => Opportunity,
    opportunity => opportunity.community,
    { eager: false, cascade: false }
  )
  opportunity?: Opportunity;

  // The credential profile  that is used for determining membership of this community
  @OneToOne(() => Credential, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  credential!: Credential;

  // The parent community can have many child communities; the relationship is controlled by the child.
  @ManyToOne(() => Community, { eager: false, cascade: false })
  parentCommunity?: Community;

  constructor(name: string) {
    super();
    this.displayName = name;
    this.ecoverseID = '';
  }
}
