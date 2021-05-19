import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { Profile } from '@domain/community/profile/profile.entity';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { IOrganisation } from './organisation.interface';
import { Challenge } from '@domain/challenge';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class Organisation extends BaseCherrytwistEntity
  implements IOrganisation, IGroupable {
  @Column()
  name: string;

  @Column()
  textID: string;

  @OneToOne(() => Profile, { eager: true, cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  profile?: Profile;

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.organisation,
    { eager: false, cascade: true }
  )
  groups?: UserGroup[];

  @ManyToMany(
    () => Challenge,
    challenge => challenge.leadOrganisations,
    { eager: false, cascade: false }
  )
  challenges!: Challenge[];

  constructor(textID: string) {
    super();
    this.name = '';
    this.textID = textID;
  }
}
