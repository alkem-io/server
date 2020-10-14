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
    { eager: true, cascade: true }
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
    { eager: true, cascade: true }
  )
  focalPoint?: User;

  @Field(() => Profile, {
    nullable: true,
    description: 'The profile for the user group',
  })
  @OneToOne(() => Profile, { eager: true, cascade: true })
  @JoinColumn()
  profile?: Profile;

  @ManyToOne(
    () => Ecoverse,
    ecoverse => ecoverse.groups
  )
  ecoverse?: Promise<Ecoverse>;

  @ManyToOne(
    () => Ecoverse,
    organisation => organisation.groups
  )
  organisation?: Promise<Organisation>;

  @ManyToOne(
    () => Challenge,
    challenge => challenge.groups
  )
  challenge?: Promise<Challenge>;

  constructor(name: string) {
    super();
    this.name = name;

    this.profile = new Profile();
    // todo: initialise this.profile.initialiseMembers();
  }
}

export enum RestrictedGroupNames {
  Admins = 'admins',
  Members = 'members',
}
