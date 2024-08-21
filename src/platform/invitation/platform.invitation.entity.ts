import { Column, Entity, ManyToOne } from 'typeorm';
import { Community } from '@domain/community/community/community.entity';
import { IPlatformInvitation } from './platform.invitation.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { PlatformRole } from '@common/enums/platform.role';
import { Platform } from '@platform/platfrom/platform.entity';
import { ENUM_LENGTH, MID_TEXT_LENGTH, UUID_LENGTH } from '@common/constants';
@Entity()
export class PlatformInvitation
  extends AuthorizableEntity
  implements IPlatformInvitation
{
  // Platform invitations for Community
  @ManyToOne(() => Community, community => community.platformInvitations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  community?: Community;

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

  @Column('varchar', { length: 255, nullable: false })
  email = '';

  @Column('varchar', { length: 255, nullable: true })
  firstName = '';

  @Column('varchar', { length: 255, nullable: true })
  lastName = '';

  @Column('char', { length: UUID_LENGTH, nullable: true })
  createdBy?: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  welcomeMessage?: string;

  @Column('boolean', { default: false })
  profileCreated!: boolean;
}
