import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User, UserGroup, Challenge, DID, Organisation, Context, Tag } from '.';


@Entity()
@ObjectType()
export class Ecoverse extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  // The context and host organisation
  @Field(() => String, {nullable: false, description: ""})
  @Column()
  name: string = '';

  @Field(() => Organisation, {nullable: true, description: "The organisation that hosts this Ecoverse instance"})
  @OneToOne(type => Organisation, {eager: true, cascade: true})
  @JoinColumn()
  ecoverseHost?: Organisation;

  @Field(() => Context, {nullable: true, description: "The shared understanding for the Ecoverse"})
  @OneToOne(type => Context, {eager: true, cascade: true})
  @JoinColumn()
  context?: Context;

  // The digital identity for the Ecoverse - critical for its trusted role
  @OneToOne(type => DID, { eager: true, cascade: true })
  @JoinColumn()
  DID!: DID;

  @Field(() => [User], {nullable: true, description: "The community for the ecoverse"})
  @OneToMany(
    type => User,
    user => user.ecoverse,
    { eager: true, cascade: true },
  )
  members?: User[];

  @Field(() => [UserGroup], { nullable: true })
  @OneToMany(
    type => UserGroup,
    userGroup => userGroup.ecoverseMember,
    { eager: true, cascade: true },
  )
  groups?: UserGroup[];

  @Field(() => [Organisation], {nullable: true, description: "The set of partner organisations associated with this Ecoverse"})
  @OneToMany(
    type => Organisation,
    organisation => organisation.ecoverse,
    { eager: true, cascade: true },
  )
  partners?: Organisation[];

  // 
  @Field(() => [Challenge], {nullable: true, description: "The Challenges hosted by the Ecoverse"})
  @OneToMany(
    type => Challenge,
    challenge => challenge.ecoverse,
    { eager: true, cascade: true },
  )
  challenges?: Challenge[];

  @Field(() => [Tag], {nullable: true, description: "Set of restricted tags that are used within this ecoverse"})
  @ManyToMany(
    type => Tag,
    tag => tag.ecoverses,
    { eager: true, cascade: true })
  @JoinTable()
  tags?: Tag[];

  // Functional methods for managing the Ecoverse
  constructor(name: string) {
    super();
    this.name = name;
  }

}