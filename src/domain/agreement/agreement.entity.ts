import { Field } from '@nestjs/graphql/dist/decorators/field.decorator';
import { ObjectType } from '@nestjs/graphql/dist/decorators/object-type.decorator';
import { ID } from '@nestjs/graphql/dist/scalars';
import { Project } from '../project/project.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IAgreement } from './agreement.interface';
import { RestrictedTagsetNames, Tagset } from '../tagset/tagset.entity';

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

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the agreement',
  })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset: Tagset;

  constructor(name: string) {
    super();
    this.name = name;
    this.tagset = new Tagset(RestrictedTagsetNames.Default);
    //todo - ensure tagset is properly initialised
  }
}
