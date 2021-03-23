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
import { ITagset } from './tagset.interface';
import { Profile } from '@domain/community/profile/profile.entity';

export enum RestrictedTagsetNames {
  Default = 'default',
  Skills = 'skills',
}

@Entity()
@ObjectType()
export class Tagset extends BaseEntity implements ITagset {
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
  @Column({ default: RestrictedTagsetNames.Default })
  name: string;

  @Field(() => [String])
  @Column('simple-array')
  tags: string[];

  @ManyToOne(
    () => Profile,
    profile => profile.tagsets
  )
  profile?: Profile;

  constructor(name: string) {
    super();
    this.tags = [];
    this.name = name;
  }
}
