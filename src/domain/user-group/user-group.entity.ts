import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Challenge } from '../challenge/challenge.entity';
import { Ecoverse } from '../ecoverse/ecoverse.entity';
import { Organisation } from '../organisation/organisation.entity';
import { User } from '../user/user.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IUserGroup } from './user-group.interface';
import { Profile } from '../profile/profile.entity';
import { Opportunity } from '../opportunity/opportunity.entity';

@Entity()
@ObjectType()
export class UserGroup extends BaseEntity implements IUserGroup {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => [User], {
    nullable: true,
    description: 'The set of users that are members of this group',
  })
  @ManyToMany(
    () => User,
    user => user.userGroups,
    { eager: false, cascade: true }
  )
  @JoinTable({ name: 'user_group_members' })
  members?: User[];

  @Field(() => User, {
    nullable: true,
    description: 'The focal point for this group',
  })
  @ManyToOne(
    () => User,
    user => user.focalPoints,
    { eager: false, cascade: true }
  )
  focalPoint?: User | null;

  @Field(() => Profile, {
    nullable: true,
    description: 'The profile for the user group',
  })
  @OneToOne(() => Profile, { eager: true, cascade: true })
  @JoinColumn()
  profile?: Profile;

  @ManyToOne(
    () => Ecoverse,
    ecoverse => ecoverse.groups,
    { eager: false }
  )
  ecoverse?: Ecoverse;

  @Column()
  includeInSearch: boolean;

  @ManyToOne(
    () => Organisation,
    organisation => organisation.groups,
    { eager: false }
  )
  organisation?: Organisation;

  @ManyToOne(
    () => Challenge,
    challenge => challenge.groups,
    { eager: false }
  )
  challenge?: Challenge;

  @ManyToOne(
    () => Opportunity,
    opportunity => opportunity.groups,
    { eager: false }
  )
  opportunity?: Opportunity;

  // Flag to say whether members field should be populated
  membersPopulationEnabled = true;

  constructor(name: string) {
    super();
    this.name = name;
    this.includeInSearch = true;
  }
}

export enum RestrictedGroupNames {
  Members = 'members',
  CommunityAdmins = 'community-admins',
  EcoverseAdmins = 'ecoverse-admins',
  GlobalAdmins = 'global-admins',
}
