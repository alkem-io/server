import { Column, Entity, ManyToOne } from 'typeorm';
import { Community } from '@domain/community/community/community.entity';
import { IInvitationExternal } from './invitation.external.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
@Entity()
export class InvitationExternal
  extends AuthorizableEntity
  implements IInvitationExternal
{
  @ManyToOne(() => Community, community => community.externalInvitations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  community!: Community;

  @Column('varchar', { length: 255, nullable: false })
  email = '';

  @Column('varchar', { length: 255, nullable: true })
  firstName = '';

  @Column('varchar', { length: 255, nullable: true })
  lastName = '';

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @Column('varchar', { length: 512, nullable: true })
  welcomeMessage!: string;

  @Column('boolean', { default: false })
  profileCreated!: boolean;

  @Column('boolean', { default: false })
  invitedToParent!: boolean;
}
