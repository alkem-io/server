import { ID, Field, ObjectType } from '@nestjs/graphql';
import { Project } from '@domain/collaboration/project/project.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IAgreement } from './agreement.interface';
import {
  RestrictedTagsetNames,
  Tagset,
} from '@domain/common/tagset/tagset.entity';

@Entity()
@ObjectType()
export class Agreement extends BaseEntity implements IAgreement {
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
  @Column('text', { nullable: true })
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
  }
}
