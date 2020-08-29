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

  @Field(() => Context)
  @OneToOne(type => Context, context => context.ecoverse, {cascade: true})
  @JoinColumn()
  context?: Context;

  // Community

  @Field(() => UserGroup)
  @OneToOne(type => UserGroup, userGroup => userGroup.challenge, {cascade: true})
  @JoinColumn()
  challengeLeads!: UserGroup;


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

  // Other
  @Field(() => String)
  @Column()
  lifecyclePhase: string = '';

  @Field(() => [Tag])
  @OneToMany(
    type => Tag,
    tag => tag.challenge,
    { eager: true, cascade: true, nullable: true },
  )
  tags?: Tag[];

  @OneToMany(
    type => Project,
    project => project.challenge,
    { eager: true, cascade: true },
  )
  projects?: Project[];
  
  @OneToOne(type => DID, did => did.challenge)
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