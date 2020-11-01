import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ecoverse } from '../ecoverse/ecoverse.entity';
import { User } from '../user/user.entity';
import { ITemplate } from './template.interface';

@Entity()
@ObjectType()
export class Template extends BaseEntity implements ITemplate {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String)
  @Column('varchar', { length: 300 })
  description: string;

  @Field(() => [User], {
    nullable: true,
    description:
      'The set of user types that are available within this template',
  })
  @ManyToMany(
    () => User,
    user => user.templates,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'template_members' })
  users?: User[];

  @ManyToOne(
    () => Ecoverse,
    ecoverse => ecoverse.templates
  )
  ecoverse?: Ecoverse;

  constructor(name: string, description: string) {
    super();
    this.name = name;
    this.description = description;
  }
}
