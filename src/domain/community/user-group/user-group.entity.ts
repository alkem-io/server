import { Organisation } from '@domain/community/organisation/organisation.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IUserGroup } from '@domain/community/user-group';
import { Profile } from '@domain/community/profile/profile.entity';
import { Community } from '../community';
import { AuthorizableEntity } from '@domain/common/authorizable-entity';

@Entity()
export class UserGroup extends AuthorizableEntity implements IUserGroup {
  @Column()
  name: string;

  @Column()
  ecoverseID?: string;

  @OneToOne(() => Profile, { eager: true, cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  profile?: Profile;

  @ManyToOne(
    () => Organisation,
    organisation => organisation.groups,
    { eager: false, cascade: false, onDelete: 'SET NULL' }
  )
  organisation?: Organisation;

  @ManyToOne(
    () => Community,
    community => community.groups,
    { eager: false, onDelete: 'CASCADE' }
  )
  community?: Community;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
