import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '.';
import { ITagsetable } from '../interfaces';
import { ITagset } from 'src/interfaces/ITagset';

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

  @ManyToOne(() => User, user => user.tagsets)
  user?: User;

  /* Adds a tag, returning boolean for whether the tag was newly added or not */
  addTag(tagName: string): boolean {
    // Check that the tag does not already exist
    if (!this.tags?.includes(tagName)) {
      this.tags?.push(tagName);
      return true;
    }
    return false;

  }

  constructor(name: string) {
    super();
    this.name = name;
  }

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  initialiseMembers(): Tagset {
    if (!this.tags) {
      this.tags = [];
    }

    return this;
  }

  static createRestrictedTagsets(tagsetable: ITagsetable, names: string[]): boolean {
    if (!tagsetable.restrictedTagsetNames) {
      throw new Error('Non-initialised tagsetable submitted');
    }
    for (const name of names) {
      const tagset = new Tagset(name);
      tagset.initialiseMembers();
      tagsetable.tagsets?.push(tagset);
    }
    return true;
  }

  // Get the default tagset
  static defaultTagset(tagsetable: ITagsetable): Tagset {
    if (!tagsetable.tagsets) throw new Error('Tagsets not initialised');
    for (const tagset of tagsetable.tagsets) {
      if (tagset.name === RestrictedTagsetNames.Default) {
        return tagset;
      }
   }
    throw new Error('Unable to find default tagset');
  }

  static hasTagsetWithName(tagsetable: ITagsetable, name: string): boolean {
    // Double check groups array is initialised
    if (!tagsetable.tagsets) {
      throw new Error('Non-initialised Tagsets submitted');
    }

    // Find the right group
    for (const tagset of tagsetable.tagsets) {
      if (tagset.name === name) {
        return true;
      }
    }

    // If get here then no match group was found
    return false;
  }

  static getTagsetByName(tagsetable: ITagsetable, name: string): Tagset {
    // Double check groups array is initialised
    if (!tagsetable.tagsets) {
      throw new Error('Non-initialised tagsetable submitted');
    }

    for (const tagset of tagsetable.tagsets) {
      if (tagset.name === name) {
        return tagset;
      }
    }

    // If get here then no match group was found
    throw new Error('Unable to find tagset with the name:' + { name });
  }

  static addTagsetWithName(tagsetable: ITagsetable, name: string): Tagset {
    // Check if the group already exists, if so log a warning
    if (this.hasTagsetWithName(tagsetable, name)) {
      // TODO: log a warning
      return this.getTagsetByName(tagsetable, name);
    }

    if (tagsetable.restrictedTagsetNames?.includes(name)) {
      console.log(`Attempted to create a tagset using a restricted name: ${name}`);
      throw new Error('Unable to create tagset with restricted name: ' + { name });
    }

    const newTagset = new Tagset(name);
    newTagset.initialiseMembers();
    tagsetable.tagsets?.push(newTagset);
    return newTagset;
  }
}

export enum RestrictedTagsetNames {
  Default = 'default',
  Skills = 'skills',
}
