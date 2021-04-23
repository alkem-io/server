import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import JSON from 'graphql-type-json';
@Entity()
@ObjectType()
export class Lifecycle extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  // Stores the xstate current state representation
  @Column('text', { nullable: true })
  machineState?: string;

  // Stores the xstate engine definition
  @Field(() => JSON, {
    description:
      'The machine definition, describing the states, transitions etc for this Lifeycle.',
  })
  @Column('text', { nullable: true })
  machineDef: string;

  constructor(machine: any) {
    super();
    this.machineDef = machine;
  }
}
