import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ActorGroup } from '@domain/context/actor-group/actor-group.entity';
import { IActor } from '@domain/context/actor/actor.interface';
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

@Entity()
@ObjectType()
export class Actor extends BaseEntity implements IActor {
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
  @Column('varchar', { length: 255, nullable: true })
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
