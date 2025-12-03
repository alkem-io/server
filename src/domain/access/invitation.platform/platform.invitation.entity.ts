import { Column, Entity, ManyToOne } from 'typeorm';
import { IPlatformInvitation } from './platform.invitation.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { LONGER_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { RoleName } from '@common/enums/role.name';
@Entity()
export class PlatformInvitation
  extends AuthorizableEntity
  implements IPlatformInvitation
{
  @ManyToOne(() => RoleSet, roleSet => roleSet.platformInvitations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  roleSet?: RoleSet;

  @Column('boolean', { default: false })
  roleSetInvitedToParent!: boolean;

  @Column('simple-array', { nullable: false })
  roleSetExtraRoles!: RoleName[];

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  email!: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  firstName?: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  lastName?: string;

  @Column('uuid', { nullable: false })
  createdBy!: string;

  @Column('varchar', { length: LONGER_TEXT_LENGTH, nullable: true })
  welcomeMessage?: string;

  @Column('boolean', { default: false })
  profileCreated!: boolean;
}
