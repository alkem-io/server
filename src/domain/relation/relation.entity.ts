import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IRelation } from './relation.interface';
import { Opportunity } from '../opportunity/opportunity.entity';

@Entity()
@ObjectType()
export class Relation extends BaseEntity implements IRelation {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column('varchar', { length: 20 })
  type = '';

  @Field(() => String)
  @Column('varchar', { length: 100 })
  actorName = '';

  @Field(() => String)
  @Column('varchar', { length: 100 })
  actorType = '';

  @Field(() => String)
  @Column('varchar', { length: 100 })
  actorRole = '';

  @Field(() => String)
  @Column('varchar', { length: 400 })
  description = '';

  @ManyToOne(
    () => Opportunity,
    opportunity => opportunity.relations
  )
  opportunity?: Opportunity;
}
