/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Field, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { DID, User, UserGroup, Context, Ecoverse, Project, RestrictedGroupNames, Tagset, RestrictedTagsetNames } from '.';
import { Organisation } from './Organisation';
import { IChallenge } from 'src/interfaces/IChallenge';
import { IGroupable, ITaggable } from '../interfaces';

@Entity()
@ObjectType()
export class Challenge extends BaseEntity implements IChallenge, IGroupable, ITaggable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, { nullable: false, description: 'The name of the challenge' })
  @Column('varchar', { length: 100 })
  name: string;

  @Field(() => Context, { nullable: true, description: 'The shared understanding for the challenge' })
  @OneToOne(() => Context, { eager: true, cascade: true })
  @JoinColumn()
  context: Context;

  // Community
  @Field(() => [Organisation], {
    description: 'The leads for the challenge. The focal point for the user group is the primary challenge lead.',
  })
  @ManyToMany(() => Organisation, organisation => organisation.challenges, { eager: true, cascade: true })
  @JoinTable({ name: 'challenge_lead' })
  challengeLeads?: Organisation[];

  @Field(() => [UserGroup], {
    nullable: true,
    description:
      'Groups of users related to a challenge; each group also results in a role that is assigned to users in the group.',
  })
  @OneToMany(() => UserGroup, userGroup => userGroup.challenge, { eager: true, cascade: true })
  groups?: UserGroup[];

  @Field(() => [User], {
    nullable: true,
    description: 'The community of users, including challenge leads, that are contributing.',
  })
  contributors?: User[];

  // Other
  @Field(() => String, {
    nullable: true,
    description: 'The maturity phase of the challenge i.e. new, being refined, ongoing etc',
  })
  @Column({ nullable: true })
  lifecyclePhase?: string;

  @Field(() => Tagset, { nullable: true, description: 'The set of tags for the challenge' })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset: Tagset;

  @Field(() => [Project], { nullable: true, description: 'The set of projects within the context of this challenge' })
  @OneToMany(() => Project, project => project.challenge, { eager: true, cascade: true })
  projects?: Project[];

  @OneToOne(() => DID, { eager: true, cascade: true })
  @JoinColumn()
  DID!: DID;

  @ManyToOne(() => Ecoverse, ecoverse => ecoverse.challenges)
  ecoverse?: Ecoverse;

  // The restricted group names at the challenge level
  restrictedGroupNames?: string[];

  constructor(name: string) {
    super();
    this.name = name;
    this.context = new Context();
    this.tagset = new Tagset(RestrictedTagsetNames.Default);
    this.tagset.initialiseMembers();
    this.restrictedGroupNames = [RestrictedGroupNames.Members];
  }

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  initialiseMembers(): Challenge {
    if (!this.restrictedGroupNames) {
      this.restrictedGroupNames = [RestrictedGroupNames.Members];
    }

    if (!this.groups) {
      this.groups = [];
    }
    // Check that the mandatory groups for a challenge are created
    UserGroup.addMandatoryGroups(this, this.restrictedGroupNames);

    if (!this.projects) {
      this.projects = [];
    }

    return this;
  }
}
