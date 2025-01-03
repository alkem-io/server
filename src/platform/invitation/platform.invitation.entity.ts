import { Column, Entity, ManyToOne } from 'typeorm';
import { IPlatformInvitation } from './platform.invitation.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { PlatformRole } from '@common/enums/platform.role';
import { Platform } from '@platform/platform/platform.entity';
import {
  ENUM_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  UUID_LENGTH,
} from '@common/constants';
import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { RoleType } from '@common/enums/role.type';
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

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: true,
  })
  roleSetExtraRole?: RoleType;

  // Platform invitations for Community
  @ManyToOne(() => Platform, platform => platform.platformInvitations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  platform?: Platform;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: true,
  })
  platformRole?: PlatformRole;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  email!: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  firstName?: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  lastName?: string;

  @Column('char', { length: UUID_LENGTH, nullable: false })
  createdBy!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  welcomeMessage?: string;

  @Column('boolean', { default: false })
  profileCreated!: boolean;
}
