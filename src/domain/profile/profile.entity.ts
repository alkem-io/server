import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reference } from '@domain/reference/reference.entity';
import { RestrictedTagsetNames, Tagset } from '@domain/tagset/tagset.entity';
import { IProfile } from './profile.interface';

@Entity()
@ObjectType()
export class Profile extends BaseEntity implements IProfile {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => [Reference], {
    nullable: true,
    description: 'A list of URLs to relevant information.',
  })
  @OneToMany(
    () => Reference,
    reference => reference.profile,
    { eager: true, cascade: true }
  )
  references?: Reference[];

  @Field(() => [Tagset], {
    nullable: true,
    description: 'A list of named tagsets, each of which has a list of tags.',
  })
  @OneToMany(
    () => Tagset,
    tagset => tagset.profile,
    { eager: true, cascade: true }
  )
  tagsets?: Tagset[];

  @Field(() => String, {
    nullable: true,
    description:
      'A URI that points to the location of an avatar, either on a shared location or a gravatar',
  })
  @Column('varchar', { length: 250 })
  avatar = '';

  @Field(() => String, {
    nullable: true,
    description:
      'A short description of the entity associated with this profile.',
  })
  @Column('varchar', { length: 400 })
  description = '';

  restrictedTagsetNames?: string[];

  // Constructor
  constructor() {
    super();
    this.restrictedTagsetNames = [RestrictedTagsetNames.Default];
  }
}
