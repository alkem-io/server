import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, OneToMany, ManyToMany } from 'typeorm';
import { DID, Tag, User, UserGroup, Context, Ecoverse, Project } from '.';

@Entity()
@ObjectType()
export class Challenge extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String)
  @Column()
  name: string = '';

  @Field(() => String)
  @Column()
  description: string = '';

  @Field(() => String)
  @Column()
  lifecyclePhase: string = '';

  @Field(() => UserGroup)
  @OneToOne(type => UserGroup, userGroup => userGroup.challenge, {cascade: true})
  challengeLeads!: UserGroup;

  @Field(() => Context)
  @OneToOne(type => Context, context => context.ecoverse, {cascade: true})
  context?: Context;

  @Field(() => [UserGroup])
  @OneToMany(
    type => UserGroup,
    userGroup => userGroup.challenge,
    { eager: true, cascade: true },
  )
  groups?: UserGroup[];

  @Field(() => [User])
  @OneToMany(
    type => User,
    users => users.challenge,
    { eager: true, cascade: true },
  )
  contributors?: User[];

  @Field(() => [Tag])
  @OneToMany(
    type => Tag,
    tag => tag.challenge,
    { eager: true, cascade: true, nullable: true },
  )
  tags?: Tag[];

  @Field(() => [Project])
  @OneToMany(
    type => Project,
    project => project.challenge,
    { eager: true, cascade: true },
  )
  projects?: Project[];
  
  @Field(() => DID)
  @OneToOne(type => DID, did => did.challenge)
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