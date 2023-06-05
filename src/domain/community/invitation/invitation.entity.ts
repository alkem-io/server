import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Community } from '@domain/community/community/community.entity';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { IInvitation } from './invitation.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
@Entity()
export class Invitation extends AuthorizableEntity implements IInvitation {
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

  @Column('char', { length: 36, nullable: true })
  invitedUser!: string;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;
}
