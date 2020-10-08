import { Field } from '@nestjs/graphql/dist/decorators/field.decorator';
import { ObjectType } from '@nestjs/graphql/dist/decorators/object-type.decorator';
import { ID } from '@nestjs/graphql/dist/scalars';
import { Project } from '../project/project.entity';
import { Tag } from '../tag/tag.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IAgreement } from './agreement.interface';

@Entity()
@ObjectType()
export class Agreement extends BaseEntity implements IAgreement {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String)
  @Column()
  description?: string;

  @ManyToOne(
    () => Project,
    project => project.agreements
  )
  project?: Project;

  @Field(() => [Tag], {
    nullable: true,
    description: 'The set of tags for this Agreement e.g. Team, Nature etc.',
  })
  @ManyToMany(
    () => Tag,
    tag => tag.agreements,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'agreement_tag' })
  tags?: Tag[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}
