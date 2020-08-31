import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany, ManyToOne } from 'typeorm';
import {  Tag, Project } from '.';

@Entity()
@ObjectType()
export class Agreement extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String)
  @Column()
  name: string = '';

  @Field(() => String)
  @Column()
  description: string = '';

  @ManyToOne(
    type => Project,
    project => project.agreements
  )
  project?: Project;

  constructor(name: string) {
    super();
    this.name = name;
  }

}