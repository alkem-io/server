import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Challenge } from '../challenge/challenge.entity';
import { Reference } from '../reference/reference.entity';
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IContext } from './context.interface';

@Entity()
@ObjectType()
export class Context extends BaseEntity implements IContext {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, {
    nullable: true,
    description: 'A one line description',
  })
  @Column('varchar', { length: 250 })
  tagline?: string = '';

  @Field(() => String, {
    nullable: true,
    description: 'A detailed description of the current situation',
  })
  @Column('varchar', { length: 2000 })
  background?: string = '';

  @Field(() => String, {
    nullable: true,
    description: 'The goal that is being pursued',
  })
  @Column('varchar', { length: 2000 })
  vision?: string = '';

  @Field(() => String, {
    nullable: true,
    description: 'What is the potential impact?',
  })
  @Column('varchar', { length: 2000 })
  impact?: string = '';

  @Field(() => String, {
    nullable: true,
    description: 'Who should get involved in this challenge',
  })
  @Column('varchar', { length: 2000 })
  who?: string = '';

  @OneToOne(
    () => Challenge,
    challenge => challenge.context
  )
  context?: Context;

  @Field(() => [Reference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  @OneToMany(
    () => Reference,
    reference => reference.context,
    { eager: true, cascade: true }
  )
  references?: Reference[];

  // Constructor
  constructor() {
    super();
    //this.references = [];
  }
}
