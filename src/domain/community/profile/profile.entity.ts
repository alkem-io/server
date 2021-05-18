import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Reference } from '@domain/common/reference/reference.entity';
import {
  RestrictedTagsetNames,
  Tagset,
} from '@domain/common/tagset/tagset.entity';
import { IProfile } from './profile.interface';
import { IReference } from '@domain/common/reference';

@Entity()
@ObjectType()
export class Profile extends BaseEntity implements IProfile {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Field(() => [IReference], {
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
  @Column('text', { nullable: true })
  avatar = '';

  @Field(() => String, {
    nullable: true,
    description:
      'A short description of the entity associated with this profile.',
  })
  @Column('text', { nullable: true })
  description = '';

  restrictedTagsetNames?: string[];

  // Constructor
  constructor() {
    super();
    this.restrictedTagsetNames = [RestrictedTagsetNames.Default];
  }
}
