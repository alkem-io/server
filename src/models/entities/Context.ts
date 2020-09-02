import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Tag } from '.';
import { Challenge } from './Challenge';
import { Ecoverse } from './Ecoverse';

@Entity()
@ObjectType()
export class Context extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, {nullable: true, description: "A one line description"})
  @Column()
  description?: string = '';

  @Field(() => String, {nullable: true, description: "The goal that is being pursued"})
  @Column()
  vision?: string = '';

  @Field(() => String, {nullable: true, description: "The norms for contributors to follow"})
  @Column()
  principles?: string = '';

  @Field(() => String, {nullable: true, description: "A list of URLs to relevant information."})
  @Column()
  referenceLinks?: string = '';


}