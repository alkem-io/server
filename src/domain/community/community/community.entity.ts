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
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { UUID_LENGTH } from '@src/common/constants/entity.field.length.constants';
import { CommunityGuidelines } from '../community-guidelines/community.guidelines.entity';
import { RoleManager } from '@domain/access/role-manager';

@Entity()
export class Community
  extends AuthorizableEntity
  implements ICommunity, IGroupable
{
  @OneToOne(() => Communication, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  communication?: Communication;

  @OneToOne(() => CommunityGuidelines, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  guidelines?: CommunityGuidelines;

  @OneToMany(() => UserGroup, userGroup => userGroup.community, {
    eager: false,
    cascade: true,
  })
  groups?: UserGroup[];

  @OneToOne(() => RoleManager, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  roleManager!: RoleManager;

  // The parent community can have many child communities; the relationship is controlled by the child.
  @ManyToOne(() => Community, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  parentCommunity?: Community;

  @Column({
    length: UUID_LENGTH,
  })
  parentID!: string;

  constructor() {
    super();
    this.parentID = '';
  }
}
