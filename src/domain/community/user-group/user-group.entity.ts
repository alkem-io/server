import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Community } from '@domain/community/community/community.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

@Entity()
export class UserGroup extends AuthorizableEntity implements IUserGroup {
  @OneToOne(() => Profile, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  profile?: Profile;

  @ManyToOne(
    () => Organization,
    organization => organization.groups,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  organization?: Organization;

  @ManyToOne(
    () => Community,
    community => community.groups,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  community?: Community;

  constructor() {
    super();
  }
}
