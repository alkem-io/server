import { Organisation } from '@domain/community/organisation/organisation.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Profile } from '@domain/community/profile/profile.entity';
import { Community } from '@domain/community/community/community.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class UserGroup extends AuthorizableEntity implements IUserGroup {
  @Column()
  name: string;

  @Column()
  ecoverseID?: string;

  @OneToOne(() => Profile, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  profile?: Profile;

  @ManyToOne(
    () => Organisation,
    organisation => organisation.groups,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  organisation?: Organisation;

  @ManyToOne(
    () => Community,
    community => community.groups,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  community?: Community;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
