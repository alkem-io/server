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
import { IReference } from './reference.interface';
import { Context } from '@domain/context/context/context.entity';
import { Profile } from '@domain/community/profile/profile.entity';
import { Context2 } from '@domain/context/context/context2.entity';

@Entity()
@ObjectType()
export class Reference extends BaseEntity implements IReference {
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

  @Field(() => String)
  @Column('text')
  uri: string;

  @Field(() => String)
  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(
    () => Context,
    context => context.references,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  context?: Context;

  @ManyToOne(
    () => Context2,
    context2 => context2.references,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  context2?: Context2;

  @ManyToOne(
    () => Profile,
    profile => profile.references,
    { eager: false, cascade: false, onDelete: 'CASCADE' }
  )
  profile?: Profile;

  constructor(name: string, uri: string, description?: string) {
    super();
    this.name = name;
    this.uri = uri;
    this.description = '';
    if (description) {
      this.description = description;
    }
  }
}
