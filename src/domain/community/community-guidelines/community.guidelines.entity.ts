import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { ICommunityGuidelines } from './community.guidelines.interface';

@Entity()
export class CommunityGuidelines
  extends AuthorizableEntity
  implements ICommunityGuidelines
{
  @OneToOne(() => Profile, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;
}
