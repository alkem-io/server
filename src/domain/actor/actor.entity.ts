import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ActorGroup } from '@domain/actor-group/actor-group.entity';
import { IActor } from '@domain/actor/actor.interface';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
@ObjectType()
export class Actor extends BaseEntity implements IActor {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String, {
    nullable: true,
    description: 'A description of this actor',
  })
  @Column('text', { nullable: true })
  description?: string;

  @Field(() => String, {
    nullable: true,
    description: 'A value derived by this actor',
  })
  @Column('text', { nullable: true })
  value?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The change / effort required of this actor',
  })
  @Column('varchar')
  impact?: string;

  @ManyToOne(
    () => ActorGroup,
    actorGroup => actorGroup.actors
  )
  actorGroup?: ActorGroup;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
