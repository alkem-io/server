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

  @OneToOne(type => UserGroup, userGroup => userGroup.challenge)
  challengeLeads!: UserGroup;

  @OneToOne(type => Context, context => context.ecoverse)
  context!: Context;

  @OneToMany(
    type => UserGroup,
    userGroup => userGroup.challenge,
    { eager: true },
  )
  groups!: UserGroup[];

  @OneToMany(
    type => User,
    users => users.challenge,
    { eager: true },
  )
  contributors!: User[];

  @OneToMany(
    type => Tag,
    tag => tag.challenge,
    { eager: true },
  )
  tags!: Tag[];

  @OneToMany(
    type => Project,
    project => project.challenge,
    { eager: true },
  )
  projects!: Project[];
  
  @OneToOne(type => DID, did => did.challenge)
  DID!: DID;

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.challenges
  )
  ecoverse!: Ecoverse;

  constructor(name: string) {
    super();
    this.name = name;
  }

}