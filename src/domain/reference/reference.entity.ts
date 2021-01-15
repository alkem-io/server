import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IReference } from './reference.interface';
import { Context } from '@domain/context/context.entity';
import { Profile } from '@domain/profile/profile.entity';

@Entity()
@ObjectType()
export class Reference extends BaseEntity implements IReference {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

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
    context => context.references
  )
  context?: Context;

  @ManyToOne(
    () => Profile,
    profile => profile.references
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
