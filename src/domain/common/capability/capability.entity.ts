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
import { ICapability } from './capability.interface';
import { User } from '@domain/community/user';

@Entity()
@ObjectType()
export class Capability extends BaseEntity implements ICapability {
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
  subjectID: number;

  @Field(() => String)
  @Column('text')
  privilege: string;

  @ManyToOne(
    () => User,
    user => user.capabilities,
    { eager: false, cascade: false, onDelete: 'SET NULL' }
  )
  user?: User;

  constructor(subjectID: number, privilege: string) {
    super();
    this.privilege = privilege;
    this.subjectID = subjectID;
  }
}
