import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, ManyToMany } from 'typeorm';
import { Challenge, Context, User, Organisation, Project, UserGroup, Agreement, Ecoverse } from '.';

@Entity()
@ObjectType()
export class Tag extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string = '';

  @ManyToMany(
    type => Challenge,
    challenge => challenge.tags
  )
  challenges?: Challenge;

  @ManyToMany(
    type => Project,
    project => project.tags
  )
  projects?: Project;

  @ManyToMany(
    type => Organisation,
    organisation => organisation.tags
  )
  organisations?: Organisation;

  @ManyToMany(
    type => Ecoverse,
    ecoverse => ecoverse.tags
  )
  ecoverses?: Ecoverse[];

  @ManyToMany(
    type => User,
    user => user.tags
  )
  users?: User;

  @ManyToMany(
    type => UserGroup,
    userGroup => userGroup.tags
  )
  userGroups?: UserGroup;

  constructor(name: string) {
    super();
    this.name = name;
  }
}