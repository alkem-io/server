import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Community } from '@domain/community/community/community.entity';
import { IInvitationExternal } from './invitation.external.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { User } from '@domain/community/user/user.entity';
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

  @OneToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'createdBy' })
  createdBy!: string;

  @Column('varchar', { length: 512, nullable: true })
  welcomeMessage!: string;

  @Column('boolean', { default: false })
  profileCreated!: boolean;
}
