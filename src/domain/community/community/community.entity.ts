import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Communication } from '@domain/communication/communication/communication.entity';
import { ICommunity } from '@domain/community/community/community.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { UUID_LENGTH } from '@src/common/constants/entity.field.length.constants';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';

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

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.community,
    {
      eager: false,
      cascade: true,
    }
  )
  groups?: UserGroup[];

  @OneToOne(() => RoleSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  roleSet!: RoleSet;

  @Column({
    length: UUID_LENGTH,
  })
  parentID!: string;

  constructor() {
    super();
    this.parentID = '';
  }
}
