import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IRelation } from './relation.interface';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';

@Entity()
@ObjectType()
export class Relation extends BaseEntity implements IRelation {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column('varchar')
  type = '';

  @Field(() => String)
  @Column('varchar')
  actorName = '';

  @Field(() => String)
  @Column('varchar')
  actorType = '';

  @Field(() => String)
  @Column('varchar')
  actorRole = '';

  @Field(() => String, { nullable: true })
  @Column('text', { nullable: true })
  description? = '';

  @ManyToOne(
    () => Opportunity,
    opportunity => opportunity.relations
  )
  opportunity?: Opportunity;
}
