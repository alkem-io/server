import { Field, ID, ObjectType } from '@nestjs/graphql';
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

@Entity()
@ObjectType()
export class User extends BaseEntity implements IUser {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Column()
  account: string = '';

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
    userGroup => userGroup.members
  )
  userGroups?: Promise<UserGroup[]>;

  @Field(() => Profile, {
    nullable: true,
    description: 'The profile for this user',
  })
  @OneToOne(() => Profile, { eager: true, cascade: true })
  @JoinColumn()
  profile: Profile;

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.focalPoint
  )
  focalPoints?: UserGroup[];

  constructor(name: string) {
    super();
    this.name = name;
    this.profile = new Profile();
  }
}
