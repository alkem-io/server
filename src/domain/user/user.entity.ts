import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { DID } from '../did/did.entity';
import { Profile } from '../profile/profile.entity';
import { UserGroup } from '../user-group/user-group.entity';
/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { IUser } from './user.interface';
import { Template } from '../template/template.entity';

@Entity()
@ObjectType()
export class User extends BaseEntity implements IUser {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => String, {
    description:
      'The unique personal identifier (upn) for the account associated with this user profile',
  })
  @Column()
  accountUpn: string = '';

  @Field(() => String)
  @Column()
  firstName: string = '';

  @Field(() => String)
  @Column()
  lastName: string = '';

  @Field(() => String)
  @Column()
  email: string = '';

  @Field(() => String)
  @Column()
  phone: string = '';

  @Field(() => String)
  @Column()
  city: string = '';

  @Field(() => String)
  @Column()
  country: string = '';

  @Field(() => String)
  @Column()
  gender: string = '';

  @OneToOne(() => DID)
  @JoinColumn()
  DID!: DID;

  @ManyToMany(
    () => UserGroup,
    userGroup => userGroup.members,
    { eager: false }
  )
  userGroups?: UserGroup[];

  @ManyToMany(
    () => Template,
    template => template.users,
    { eager: false }
  )
  templates?: Template[];

  @Field(() => Profile, {
    nullable: true,
    description: 'The profile for this user',
  })
  @OneToOne(() => Profile, { eager: true, cascade: true })
  @JoinColumn()
  profile?: Profile;

  @Field(() => Int, {
    nullable: true,
    description:
      'The last timestamp, in seconds, when this user was modified - either via creation or via update. Note: updating of profile data or group memberships does not update this field.',
  })
  @Column()
  lastModified: number;

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.focalPoint,
    { eager: false }
  )
  focalPoints?: UserGroup[];

  constructor(name: string) {
    super();
    this.name = name;
    this.lastModified = 0;
  }
}
