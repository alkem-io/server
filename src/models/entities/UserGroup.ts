import { IUserGroup } from 'src/interfaces/IUserGroup';
import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Challenge, Ecoverse, Organisation, Tag, User } from '.';
import { IGroupable } from '../interfaces';

@Entity()
@ObjectType()
export class UserGroup extends BaseEntity implements IUserGroup {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => [User], { nullable: true, description: 'The set of users that are members of this group' })
  @ManyToMany(
    () => User,
    user => user.userGroups,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'user_group_members' })
  members?: User[];


  @Field(() => User, { nullable: true, description: 'The focal point for this group' })
  @ManyToOne(
    () => User,
    user => user.focalPoints
  )
  focalPoint?: User;

  @Field(() => [Tag], { nullable: true, description: 'The set of tags for this group e.g. Team, Nature etc.' })
  @ManyToMany(
    () => Tag,
    tag => tag.userGroups,
    { eager: true, cascade: true })
  @JoinTable({ name: 'user_group_tag' })
  tags?: Tag[];

  @ManyToOne(
    () => Ecoverse,
    ecoverse => ecoverse.groups
  )
  ecoverse?: Ecoverse;

  @ManyToOne(
    () => Ecoverse,
    organisation => organisation.groups
  )
  organisation?: Organisation;

  @ManyToOne(
    () => Challenge,
    challenge => challenge.groups
  )
  challenge?: Challenge;

  constructor(name: string) {
    super();
    this.name = name;
  }

  // Helper method to ensure all members that are arrays are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  static initialiseMembers(group: UserGroup): UserGroup {
    if (!group.members) {
      group.members = [];
    }

    return group;
  }

  ////////////////////////////////////////////////////
  // Static group related functions

  // Add a user to a group if not already added
  addUserToGroup(newUser: User): User {
    if (!this.members) {
      this.members = [];
    }

    for (const user of this.members) {
      if (newUser.name === user.name) {
        // Found an existing user
        return newUser;
      }
    }

    // User was not already a member so add the user
    this.members.push(newUser);
    return newUser;
  }

  static getGroupByName(groupable: IGroupable, name: string): UserGroup {
    // Double check groups array is initialised
    if (!groupable.groups) {
      throw new Error('Non-initialised Groupable submitted');
    }

    for (const group of groupable.groups) {
      if (group.name === name) {
        return group;
      }
    }

    // If get here then no match group was found
    throw new Error('Unable to find group with the name:' + { name });
  }

  static hasGroupWithName(groupable: IGroupable, name: string): boolean {
    // Double check groups array is initialised
    if (!groupable.groups) {
      throw new Error('Non-initialised Groupable submitted');
    }

    // Find the right group
    for (const group of groupable.groups) {
      if (group.name === name) {
        return true;
      }
    }

    // If get here then no match group was found
    return false;
  }

  static addGroupWithName(groupable: IGroupable, name: string): UserGroup {
    // Check if the group already exists, if so log a warning
    if (this.hasGroupWithName(groupable, name)) {
      // TODO: log a warning
      return this.getGroupByName(groupable, name);
    }

    if (groupable.restrictedGroupNames?.includes(name)) {
      console.log(`Attempted to create a usergroup using a restricted name: ${name}`);
      throw new Error('Unable to create user group with restricted name: ' + { name });
    }

    const newGroup = new UserGroup(name);
    groupable.groups?.push(newGroup);
    return newGroup;
  }

  /* Create the set of restricted group names for an entity that has groups */
  static createRestrictedGroups(groupable: IGroupable, names: string[]): UserGroup[] {
    if (!groupable.restrictedGroupNames) {
      groupable.restrictedGroupNames = [];
    }
    for (const name of names) {
      const group = new UserGroup(name);
      groupable.groups?.push(group);
      groupable.restrictedGroupNames.push(name);
    }

    // Todo: is this the right return type?
    if (!groupable.groups) {
      throw new Error('Cannot reach here');
    }
    return groupable.groups;
  }
}

export enum RestrictedGroupNames {
  Admins = 'admins',
  Members = 'members'
}