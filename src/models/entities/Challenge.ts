import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { DID, Tag, User, UserGroup, Context, Ecoverse, Project } from '.';
import { Organisation } from './Organisation';

@Entity()
@ObjectType()
export class Challenge extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, { nullable: false, description: "The name of the challenge" })
  @Column()
  name: string = '';

  @Field(() => Context, { nullable: true, description: "The shared understanding for the challenge" })
  @OneToOne(type => Context, { eager: true, cascade: true })
  @JoinColumn()
  context?: Context;

  // Community
  @Field(() => [Organisation], { description: "The leads for the challenge. The focal point for the user group is the primary challenge lead." })
  @ManyToMany(type => Organisation, organisation => organisation.challenges, { eager: true, cascade: true })
  @JoinTable()
  challengeLeads!: Organisation[];

  // @Field(() => UserGroup, {nullable: true, description: "The leads for the challenge. The focal point for the user group is the primary challenge lead."})
  // @OneToOne(type => UserGroup, userGroup => userGroup.challenge, {eager: true, cascade: true})
  // @JoinColumn()
  // challengeLeads!: UserGroup;


  @Field(() => [UserGroup], { nullable: true, description: "Groups of users related to a challenge; each group also results in a role that is assigned to users in the group." })
  @OneToMany(
    type => UserGroup,
    userGroup => userGroup.challenge,
    { eager: true, cascade: true },
  )
  groups?: UserGroup[];

  @Field(() => [User], { nullable: true, description: "The community of users, including challenge leads, that are contributing." })
  @OneToMany(
    type => User,
    users => users.challenge,
    { eager: true, cascade: true },
  )
  contributors?: User[];

  // Other
  @Field(() => String, { nullable: true, description: "The maturity phase of the challenge i.e. new, being refined, ongoing etc" })
  @Column()
  lifecyclePhase: string = '';

  @Field(() => [Tag], { nullable: true, description: "The set of tags to label the challenge" })
  @ManyToMany(
    type => Tag,
    tag => tag.ecoverses,
    { eager: true, cascade: true })
  @JoinTable()
  tags?: Tag[];

  @Field(() => [Project], { nullable: true, description: "The set of projects within the context of this challenge" })
  @OneToMany(
    type => Project,
    project => project.challenge,
    { eager: true, cascade: true },
  )
  projects?: Project[];

  @OneToOne(type => DID, { eager: true, cascade: true })
  @JoinColumn()
  DID!: DID;

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.challenges
  )
  ecoverse?: Ecoverse;

  constructor(name: string) {
    super();
    this.name = name;
  }

}
