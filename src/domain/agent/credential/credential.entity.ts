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
import { ICredential } from '@domain/agent/credential';
import { Agent, IAgent } from '@domain/agent/agent';

@Entity()
@ObjectType()
export class Credential extends BaseEntity implements ICredential {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Field(() => Number)
  @Column()
  resourceID: number;

  @Field(() => String)
  @Column()
  type: string;

  @ManyToOne(
    () => Agent,
    agent => agent.credentials,
    { eager: false, cascade: false, onDelete: 'SET NULL' }
  )
  agent?: IAgent;

  constructor(type: string, resourceID: number) {
    super();
    this.type = type;
    this.resourceID = resourceID;
    if (!this.resourceID) this.resourceID = -1;
  }
}
