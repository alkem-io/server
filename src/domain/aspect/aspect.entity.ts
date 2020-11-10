import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IAspect } from './aspect.interface';
import { Opportunity } from '../opportunity/opportunity.entity';
import { Project } from '../project/project.entity';

@Entity()
@ObjectType()
export class Aspect extends BaseEntity implements IAspect {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  title: string;

  @Field(() => String)
  @Column()
  framing: string;

  @Field(() => String)
  @Column('varchar', { length: 300 })
  explanation: string;

  @ManyToOne(
    () => Opportunity,
    opportunity => opportunity.aspects
  )
  opportunity?: Opportunity;

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
