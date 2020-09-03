import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, Index, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User, Tag, Ecoverse, Challenge } from '.';

@Entity()
@ObjectType()
export class UserGroup extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

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

  @Field(() => [Tag], { nullable: true, description: "The set of tags for this group e.g. Team, Nature etc." })
  @ManyToMany(
    type => Tag,
    tag => tag.ecoverses,
    { eager: true, cascade: true })
  @JoinTable()
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

  constructor(name: string) {
    super();
    this.name = name;
  }
}