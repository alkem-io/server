import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { ICommunity } from '@domain/community/community/community.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { UUID_LENGTH } from '@src/common/constants/entity.field.length.constants';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { IPlatformAccess } from '@domain/access/platform-access/platform.access.interface';

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

  @OneToMany(() => UserGroup, userGroup => userGroup.community, {
    eager: false,
    cascade: true,
  })
  groups?: UserGroup[];

  @OneToOne(() => RoleSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  roleSet!: RoleSet;

  // Calculated field to make the authorization logic clearer
  @Column('json', { nullable: false })
  platformAccess!: IPlatformAccess;

  @Column({
    length: UUID_LENGTH,
  })
  parentID!: string;

  constructor() {
    super();
    this.parentID = '';
  }
}
