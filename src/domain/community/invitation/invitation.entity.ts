import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Community } from '@domain/community/community/community.entity';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { IInvitation } from './invitation.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { ENUM_LENGTH, MID_TEXT_LENGTH, UUID_LENGTH } from '@common/constants';
@Entity()
export class Invitation extends AuthorizableEntity implements IInvitation {
  // todo ID in migration is varchar - must be char(36)
  @OneToOne(() => Lifecycle, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @ManyToOne(() => Community, community => community.invitations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  community?: Community;

  @Column('char', { length: UUID_LENGTH, nullable: false })
  invitedContributor!: string;

  @Column('char', { length: UUID_LENGTH, nullable: false })
  createdBy!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  welcomeMessage?: string;

  @Column('boolean', { default: false })
  invitedToParent!: boolean;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  contributorType!: CommunityContributorType;
}
