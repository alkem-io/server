import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, ManyToMany } from 'typeorm';
import { Challenge, Context, User, Organisation, Project, UserGroup, Agreement, Ecoverse } from '.';

@Entity()
@ObjectType()
export class Tag extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String)
  @Column()
  name: string = '';

  @ManyToOne(
    type => Challenge,
    challenge => challenge.tags
  )
  challenge?: Challenge;

  @ManyToOne(
    type => Project,
    project => project.tags
  )
  project?: Project;

  @ManyToOne(
    type => Organisation,
    organisation => organisation.tags
  )
  organisation?: Organisation;

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.tags
  )
  ecoverse?: Ecoverse;

  @ManyToOne(
    type => User,
    user => user.tags
  )
  user?: User;

  @ManyToOne(
    type => UserGroup,
    userGroup => userGroup.tags
  )
  userGroup?: UserGroup;

  constructor(name: string) {
    super();
    this.name = name;
  }
}