/* eslint-disable @typescript-eslint/no-inferrable-types */
import { ID } from '@nestjs/graphql/dist';
import { Field, ObjectType } from '@nestjs/graphql/dist/decorators';
import {
  BaseEntity,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { ICommunity } from './community.interface';
import { Application } from '@domain/community/application/application.entity';

@Entity()
@ObjectType()
export class Community extends BaseEntity implements ICommunity, IGroupable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, {
    nullable: false,
    description: 'The name of the challenge',
  })
  @Column()
  name: string;

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.community,
    { eager: true, cascade: true }
  )
  groups?: UserGroup[];

  @Field(() => [Application])
  @ManyToMany(
    () => Application,
    application => application.community,
    { eager: true, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinTable({
    name: 'Community_application',
  })
  applications?: Application[];

  // The restricted group names at the Community level
  restrictedGroupNames: string[];

  constructor(name: string, restrictedGroupNames: string[]) {
    super();
    this.name = name;
    this.restrictedGroupNames = restrictedGroupNames;
  }
}
