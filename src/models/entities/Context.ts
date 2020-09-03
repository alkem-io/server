import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, ManyToOne} from 'typeorm';
import { Tag } from '.';
import { Challenge } from './Challenge';
import { Ecoverse } from './Ecoverse';
import { Reference } from './Reference';

@Entity()
@ObjectType()
export class Context extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String, {nullable: true, description: "A one line description"})
  @Column()
  description?: string = '';

  @Field(() => String, {nullable: true, description: "The goal that is being pursued"})
  @Column()
  vision?: string = '';
  
  @Field(() => [Reference], {nullable: true, description: "A list of URLs to relevant information."})
  @OneToMany(
    type => Reference,
    reference => reference.context,
    { eager: true, cascade: true },
  )
  references?: Reference[];

  @Field(() => String, {nullable: true, description: "The norms for contributors to follow"})
  @Column()
  principles?: string = '';



}