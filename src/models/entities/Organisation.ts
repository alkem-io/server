import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, Index, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { DID, Tag, User, Ecoverse } from '.';
import { Challenge } from './Challenge';

@Entity()
@ObjectType()
export class Organisation extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, { nullable: false, description: "" })
  @Column()
  name: string = '';

  @OneToOne(type => DID)
  @JoinColumn()
  DID!: DID;

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.partners
  )
  ecoverse?: Ecoverse;

  @Field(() => [Tag], { nullable: true, description: "The set of tags applied to this organisation." })
  @ManyToMany(
    type => Tag,
    tag => tag.ecoverses,
    { eager: true, cascade: true })
  @JoinTable()
  tags?: Tag[];

  @Field(() => [User], { nullable: true, description: "The set of users that are associated with this organisation" })
  @OneToMany(
    type => User,
    user => user.member,
    { eager: true },
  )
  members?: User[];

  @ManyToMany(
    type => Challenge,
    challenge => challenge.challengeLeads,
  )
  challenges!: Challenge[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}