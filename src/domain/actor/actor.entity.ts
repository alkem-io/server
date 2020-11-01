import { Field, ID, ObjectType } from '@nestjs/graphql';

import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActorGroup } from '../actor-group/actor-group.entity';
import { IActor } from './actor.interface';

export enum RestrictedActorGroupNames {
  Collaborators = 'collaborators',
}

@Entity()
@ObjectType()
export class Actor extends BaseEntity implements IActor {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column('varchar', { length: 100 })
  name: string;

  @Field(() => String, {
    nullable: true,
    description: 'A description of this actor',
  })
  @Column('varchar', { length: 250 })
  description: string;

  @Field(() => String, {
    nullable: true,
    description: 'A value derived by this actor',
  })
  @Column('varchar', { length: 250 })
  value: string;

  @Field(() => String, {
    nullable: true,
    description: 'The change / effort required of this actor',
  })
  @Column('varchar', { length: 250 })
  impact: string;

  @ManyToOne(
    () => ActorGroup,
    actorGroup => actorGroup.actors
  )
  actorGroup?: ActorGroup;

  constructor(name: string) {
    super();
    this.name = name;
    this.description = '';
    this.value = '';
    this.impact = '';
  }
}
