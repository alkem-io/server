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
import { IRelation } from '@domain/collaboration/relation';
import { Collaboration } from '@domain/collaboration/collaboration';

@Entity()
@ObjectType()
export class Relation extends BaseEntity implements IRelation {
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
  @Column('varchar')
  type = '';

  @Field(() => String)
  @Column('varchar')
  actorName = '';

  @Field(() => String)
  @Column('varchar')
  actorType = '';

  @Field(() => String)
  @Column('varchar')
  actorRole = '';

  @Field(() => String, { nullable: true })
  @Column('text', { nullable: true })
  description? = '';

  @ManyToOne(
    () => Collaboration,
    collaboration => collaboration.relations
  )
  collaboration?: Collaboration;
}
