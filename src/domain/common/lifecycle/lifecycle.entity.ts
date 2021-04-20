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
  @Column('text', { nullable: true })
  machineDef: string;

  constructor(machine: any) {
    super();
    this.machineDef = machine;
  }
}
