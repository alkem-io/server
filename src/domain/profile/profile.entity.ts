import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Challenge } from '../challenge/challenge.entity';
import { Reference } from '../reference/reference.entity';
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IProfile } from './profile.interface';
import { ITagsetable } from 'src/interfaces/tagsetable.interface';
import { RestrictedTagsetNames, Tagset } from '../tagset/tagset.entity';

Entity()
@ObjectType()
export class Profile extends BaseEntity implements IProfile {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => [Reference], { nullable: true, description: 'A list of URLs to relevant information.' })
  @OneToMany(() => Reference, reference => reference.profile, { eager: true, cascade: true })
  references?: Reference[];

  @Field(() => [Tagset], { nullable: true, description: 'A list of named tagsets, each of which has a list of tags.' })
  @OneToMany(() => Tagset, tagset => tagset.profile, { eager: true, cascade: true })
  tagsets?: Tagset[];

  restrictedTagsetNames?: string[];

  // Constructor
  constructor() {
    super();
    this.restrictedTagsetNames = [RestrictedTagsetNames.Default];
  }


}