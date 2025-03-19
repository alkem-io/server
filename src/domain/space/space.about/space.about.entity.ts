import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { ISpaceAbout } from './space.about.interface';
import { CommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.entity';

@Entity()
export class SpaceAbout extends AuthorizableEntity implements ISpaceAbout {
  @Column('text', { nullable: true })
  why?: string = '';

  @Column('text', { nullable: true })
  who?: string = '';

  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @OneToOne(() => CommunityGuidelines, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  guidelines?: CommunityGuidelines;
}
