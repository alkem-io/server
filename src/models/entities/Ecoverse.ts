import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany, ManyToMany} from 'typeorm';
import { User, UserGroup, Challenge, DID, Organisation, Context, Tag } from '.';


@Entity()
@ObjectType()
export class Ecoverse extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  // The context and host organisation
  @Field(() => String)
  @Column()
  name: string = '';

  @Field(() => Organisation)
  @OneToOne(type => Organisation, organisation => organisation.ecoverseHost)
  @JoinColumn()
  ecoverseHost?: Organisation;

  @Field(() => Context)
  @OneToOne(type => Context, context => context.ecoverse, {cascade: true})
  @JoinColumn()
  context?: Context;

  // The digital identity for the Ecoverse - critical for its trusted role
  @OneToOne(type => DID, did => did.ecoverse)
  @JoinColumn()
  DID!: DID;

  // The community for the ecoverse
  @Field(() => [User])
  @OneToMany(
    type => User,
    user => user.ecoverse,
    { eager: true, cascade: true },
  )
  members?: User[];

  @Field(() => [UserGroup])
  @OneToMany(
    type => UserGroup,
    userGroup => userGroup.ecoverseMember,
    { eager: true, cascade: true },
  )
  groups?: UserGroup[];

  @Field(() => [Organisation])
  @OneToMany(
    type => Organisation,
    organisation => organisation.ecoverse,
    { eager: true, cascade: true },
  )
  partners?: Organisation[];

  // The Challenges hosted by the Ecoverse
  @Field(() => [Challenge])
  @OneToMany(
    type => Challenge,
    challenge => challenge.ecoverse,
    { eager: true, cascade: true },
  )
  challenges?: Challenge[];

  @Field(() => [Tag])
  @OneToMany(
    type => Tag,
    tag => tag.ecoverse,
    { eager: true },
  )
  tags?: Tag[];



  // Functional methods for managing the Ecoverse
  constructor(name: string) {
    super();
    this.name = name;
  }
  
}