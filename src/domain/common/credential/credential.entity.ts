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
import { ICredential } from './credential.interface';
import { User } from '@domain/community/user';

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
    () => User,
    user => user.credentials,
    { eager: false, cascade: false, onDelete: 'SET NULL' }
  )
  user?: User;

  constructor(type: string, resourceID: number) {
    super();
    this.type = type;
    this.resourceID = resourceID;
    if (!this.resourceID) this.resourceID = -1;
  }
}
