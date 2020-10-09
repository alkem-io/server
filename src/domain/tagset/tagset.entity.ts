import { Field, ID, ObjectType } from '@nestjs/graphql';

import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ITagset } from './tagset.interface';
import { Profile } from '../profile/profile.entity';

@Entity()
@ObjectType()
export class Tagset extends BaseEntity implements ITagset {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => [String])
  @Column('simple-array')
  tags?: string[];

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

export enum RestrictedTagsetNames {
  Default = 'default',
  Skills = 'skills',
}
