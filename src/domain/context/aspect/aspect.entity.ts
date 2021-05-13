import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IAspect } from './aspect.interface';
import { Project } from '@domain/collaboration/project/project.entity';
import { Context } from '@domain/context';

@Entity()
@ObjectType()
export class Aspect extends BaseEntity implements IAspect {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Field(() => String)
  @Column()
  title: string;

  @Field(() => String)
  @Column('text')
  framing: string;

  @Field(() => String)
  @Column('text')
  explanation: string;

  @ManyToOne(
    () => Context,
    context => context.aspects
  )
  context?: Context;

  @ManyToOne(
    () => Project,
    project => project.aspects
  )
  project?: Project;

  constructor(title: string, framing: string, explanation: string) {
    super();
    this.title = title;
    this.framing = framing;
    this.explanation = explanation;
  }
}
