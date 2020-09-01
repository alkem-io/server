import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { DID, Tag, User, UserGroup, Context, Ecoverse, Project } from '.';

@Entity()
@ObjectType()
export class Challenge extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string = '';

  @Field(() => Context, { nullable: true })
  @OneToOne(type => Context, { eager: true, cascade: true })
  @JoinColumn()
  context?: Context;

  // Community

  @Field(() => UserGroup)
  @OneToOne(type => UserGroup, userGroup => userGroup.challenge, { eager: true, cascade: true })
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

  @Field(() => [Tag], { nullable: true })
  @ManyToMany(
    type => Tag,
    tag => tag.ecoverses,
    { eager: true, cascade: true })
  @JoinTable()
  tags?: Tag[];

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