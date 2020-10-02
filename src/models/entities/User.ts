/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Field, ID, ObjectType } from 'type-graphql';
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
import { DID, UserGroup, Profile } from '.';
import { IUser } from 'src/interfaces/IUser';

@Entity()
@ObjectType()
export class User extends BaseEntity implements IUser {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

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

  @ManyToMany(() => UserGroup, userGroup => userGroup.members)
  userGroups?: UserGroup[];

  @OneToMany(() => UserGroup, userGroup => userGroup.focalPoint, { eager: false, cascade: true })
  focalPoints?: UserGroup[];

  @Field(() => Profile, { nullable: true, description: 'The profile for the user' })
  @OneToOne(() => Profile, { eager: true, cascade: true })
  @JoinColumn()
  profile: Profile;

  constructor(name: string) {
    super();
    this.name = name;
    this.profile = new Profile();
    this.profile.initialiseMembers();
  }

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  initialiseMembers(): User {
    return this;
  }

}
