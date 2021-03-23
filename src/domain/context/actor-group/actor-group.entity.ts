import { Field, ID, ObjectType } from '@nestjs/graphql';

import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Actor } from '@domain/context/actor/actor.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { IActorGroup } from './actor-group.interface';

export enum RestrictedActorGroupNames {
  Collaborators = 'collaborators',
}

@Entity()
@ObjectType()
export class ActorGroup extends BaseEntity implements IActorGroup {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String, {
    nullable: true,
    description: 'A description of this group of actors',
  })
  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(
    () => Opportunity,
    opportunity => opportunity.projects
  )
  opportunity?: Opportunity;

  @Field(() => [Actor], {
    nullable: true,
    description: 'The set of actors in this actor group',
  })
  @OneToMany(
    () => Actor,
    actor => actor.actorGroup,
    { eager: true, cascade: true }
  )
  actors?: Actor[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}
