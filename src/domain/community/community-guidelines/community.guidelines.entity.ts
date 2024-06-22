import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { ICommunityGuidelines } from './community.guidelines.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';

@Entity()
export class CommunityGuidelines
  extends AuthorizableEntity
  implements ICommunityGuidelines
{
  @OneToOne(() => Profile, {
    eager: true,
    cascade: true,
  })
  @JoinColumn()
  profile!: Profile;
}
