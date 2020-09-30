import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '.';
import { ITag } from 'src/interfaces/ITag';
import { ITaggable } from '../interfaces';
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
  @Column("simple-array")
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

  static createRestrictedTagsets(taggable: ITaggable, names: string[]): boolean {
    if (!taggable.restrictedTagsetNames) {
      throw new Error('Non-initialised Taggable submitted');
    }
    for (const name of names) {
      const tagset = new Tagset(name);
      tagset.initialiseMembers();
      taggable.tagsets?.push(tagset);
    }
    return true;
  }

  // Get the default tagset
  static defaultTagset(taggable: ITaggable): Tagset {
    if (!taggable.tagsets) throw new Error("Tagsets not initialised");
    for (const tagset of taggable.tagsets) {
      if (tagset.name === RestrictedTagsetNames.Default) {
        return tagset;
      }
   }
    throw new Error("Unable to find default tagset");
  }
}

export enum RestrictedTagsetNames {
  Default = 'default',
  Skills = 'skills',
}
