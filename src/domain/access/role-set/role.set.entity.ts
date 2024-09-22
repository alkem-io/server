import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Role } from '../role/role.entity';
import { Form } from '@domain/common/form/form.entity';
import { PlatformInvitation } from '@platform/invitation/platform.invitation.entity';
import { IRoleSet } from './role.set.interface';
import { Application } from '@domain/access/application/application.entity';
import { Invitation } from '@domain/access/invitation/invitation.entity';
import { CommunityRoleType } from '@common/enums/community.role';
import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';

@Entity()
export class RoleSet
  extends AuthorizableEntity
  implements IRoleSet, IGroupable
{
  @OneToOne(() => Form, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  applicationForm?: Form;

  @OneToMany(() => Role, role => role.roleSet, {
    eager: false,
    cascade: true,
  })
  roles?: Role[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  baseRoleType!: CommunityRoleType;

  @OneToMany(() => Application, application => application.roleSet, {
    eager: false,
    cascade: true,
  })
  applications?: Application[];

  @OneToMany(() => Invitation, invitation => invitation.roleSet, {
    eager: false,
    cascade: true,
  })
  invitations?: Invitation[];

  @OneToMany(
    () => PlatformInvitation,
    platformInvitation => platformInvitation.roleSet,
    {
      eager: false,
      cascade: true,
    }
  )
  platformInvitations?: PlatformInvitation[];

  // The parent roleSet can have many child communities; the relationship is controlled by the child.
  @ManyToOne(() => RoleSet, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  parentRoleSet?: RoleSet;
}
