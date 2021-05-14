import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Reference } from '@domain/common/reference/reference.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Aspect, IContext } from '@domain/context';
import { EcosystemModel } from '../ecosystem-model';
@Entity()
@ObjectType()
export class Context extends BaseEntity implements IContext {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Field(() => String, {
    nullable: true,
    description: 'A one line description',
  })
  @Column('varchar', { length: 255, nullable: true })
  tagline?: string = '';

  @Field(() => String, {
    nullable: true,
    description: 'A detailed description of the current situation',
  })
  @Column('text', { nullable: true })
  background?: string = '';

  @Field(() => String, {
    nullable: true,
    description: 'The goal that is being pursued',
  })
  @Column('text', { nullable: true })
  vision?: string = '';

  @Field(() => String, {
    nullable: true,
    description: 'What is the potential impact?',
  })
  @Column('text', { nullable: true })
  impact?: string = '';

  @Field(() => String, {
    nullable: true,
    description: 'Who should get involved in this challenge',
  })
  @Column('text', { nullable: true })
  who?: string = '';

  @Field(() => [Reference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  @OneToMany(
    () => Reference,
    reference => reference.context,
    { eager: true, cascade: true }
  )
  references?: Reference[];

  @OneToOne(() => EcosystemModel, { eager: false, cascade: true })
  @JoinColumn()
  ecosystemModel?: EcosystemModel;

  @OneToMany(
    () => Aspect,
    aspect => aspect.context,
    { eager: false, cascade: true }
  )
  aspects?: Aspect[];

  // Constructor
  constructor() {
    super();
  }
}
