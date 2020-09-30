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
import { DID, Tagset, UserGroup, RestrictedTagsetNames } from '.';
import { IUser } from 'src/interfaces/IUser';
import { ITag } from 'src/interfaces/ITag';
import { ITaggable } from '../interfaces';

@Entity()
@ObjectType()
export class User extends BaseEntity implements IUser, ITaggable {
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

  @OneToOne(() => DID)
  @JoinColumn()
  DID!: DID;

  @ManyToMany(() => UserGroup, userGroup => userGroup.members)
  userGroups?: UserGroup[];

  @OneToMany(() => UserGroup, userGroup => userGroup.focalPoint, { eager: false, cascade: true })
  focalPoints?: UserGroup[];

  @Field(() => [Tagset], { nullable: true, description: 'An array of named tag sets.' })
  @OneToMany(() => Tagset, tagset => tagset.user, { eager: true, cascade: true })
  tagsets?: Tagset[];

  restrictedTagsetNames?: string[];

  constructor(name: string) {
    super();
    this.name = name;
    this.restrictedTagsetNames = [RestrictedTagsetNames.Default];
  }

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  initialiseMembers(): User {
    if (!this.tagsets) {
      this.tagsets = [];
    }

    // Check that the mandatory tagsets for a user are created
    if (this.restrictedTagsetNames) {
      Tagset.createRestrictedTagsets(this, this.restrictedTagsetNames);
    }
    return this;
  }

}
