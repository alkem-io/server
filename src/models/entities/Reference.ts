import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, ManyToMany } from 'typeorm';
import { Challenge, Context, User, Organisation, Project, UserGroup, Agreement, Ecoverse } from '.';

@Entity()
@ObjectType()
export class Reference extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String)
  @Column()
  name: string = '';

  @Field(() => String)
  @Column()
  uri: string = '';

  @Field(() => String)
  @Column()
  description: string = '';

  @ManyToOne(
    type => Context,
    context => context.references
  )
  context?: Context;

  constructor(name: string, uri: string, description: string) {
    super();
    this.name = name;
    this.uri = uri;
    this.description = description;
  }
}