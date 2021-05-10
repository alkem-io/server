import { Relation } from '@domain/collaboration/relation';
import { Project } from '@domain/collaboration/project';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ICollaboration } from './collaboration.interface';

@Entity()
@ObjectType()
export class Collaboration extends BaseEntity implements ICollaboration {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Field(() => [Project], {
    nullable: true,
    description: 'The set of projects within the context of this Collaboration',
  })
  @OneToMany(
    () => Project,
    project => project.collaboration,
    { eager: true, cascade: true }
  )
  projects?: Project[];

  @OneToMany(
    () => Relation,
    relation => relation.collaboration,
    { eager: false, cascade: true }
  )
  relations?: Relation[];

  // Constructor
  constructor() {
    super();
  }
}
