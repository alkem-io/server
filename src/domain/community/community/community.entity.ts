import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { ICommunity } from '@domain/community/community/community.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { RoleSet } from '@domain/access/role-set/role.set.entity';

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

  @Column('uuid', { nullable: false })
  parentID!: string;

  constructor() {
    super();
  }
}
