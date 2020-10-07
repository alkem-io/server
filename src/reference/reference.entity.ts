import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IReference } from './reference.interface';
import { Context } from 'src/context/context.entity';

@Entity()
@ObjectType()
export class Reference extends BaseEntity implements IReference {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String)
  @Column()
  uri: string;

  @Field(() => String)
  @Column('varchar', { length: 300 })
  description: string;

  @ManyToOne(
    () => Context,
    context => context.references,
  )
  context?: Context;

  constructor(name: string, uri: string, description: string) {
    super();
    this.name = name;
    this.uri = uri;
    this.description = description;
  }
}
