import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { User, Tag, Ecoverse, Challenge } from '.';


@Entity()
@ObjectType()
export class UserGroup extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String)
  @Column()
  name: string = '';

  

  @Field(() => [User], {nullable: true, description: "The set of users that are members of this group"})
  @OneToMany(
    type => User,
    user => user.userGroup,
    { eager: true, cascade: true },
  )
  members?: User[];

  @Field(() => User, {nullable: true, description: "The focal point for this group"})
  @OneToOne(type => User)
  @JoinColumn()
  focalPoint?: User;

  @Field(() => [Tag], {nullable: true, description: "The set of tags for this group e.g. Team, Nature etc."})
  @OneToMany(
    type => Tag,
    tag => tag.userGroup,
    { eager: true, cascade: true },
  )
  tags?: Tag[];

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.groups
  )
  ecoverse?: Ecoverse;

  @ManyToOne(
    type => Challenge,
    challenge => challenge.groups
  )
  challenge?: Challenge;

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.members
  )
  ecoverseMember?: Ecoverse;

  @OneToOne(type => Challenge, challenge => challenge.challengeLeads)
  userGroup?: UserGroup;

  constructor(name: string) {
    super();
    this.name = name;
  }
}