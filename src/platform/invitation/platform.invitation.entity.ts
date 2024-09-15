import { Column, Entity, ManyToOne } from 'typeorm';
import { IPlatformInvitation } from './platform.invitation.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { PlatformRole } from '@common/enums/platform.role';
import { Platform } from '@platform/platfrom/platform.entity';
import {
  ENUM_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  UUID_LENGTH,
} from '@common/constants';
import { RoleManager } from '@domain/access/role-manager/role.manager.entity';
@Entity()
export class PlatformInvitation
  extends AuthorizableEntity
  implements IPlatformInvitation
{
  @ManyToOne(() => RoleManager, manager => manager.platformInvitations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  roleManager?: RoleManager;

  @Column('boolean', { default: false })
  communityInvitedToParent!: boolean;

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
