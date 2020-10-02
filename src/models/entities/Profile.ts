import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Reference, Tagset, RestrictedTagsetNames } from '.';
import { IProfile } from 'src/interfaces';
import { ITagsetable } from '../interfaces';

@Entity()
@ObjectType()
export class Profile extends BaseEntity implements IProfile, ITagsetable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => [Reference], { nullable: true, description: 'A list of URLs to relevant information.' })
  @OneToMany(() => Reference, reference => reference.profile, { eager: true, cascade: true })
  references?: Reference[];

  @Field(() => [Tagset], { nullable: true, description: 'A list of named tagsets, each of which has a list of tags.' })
  @OneToMany(() => Tagset, tagset => tagset.profile, { eager: true, cascade: true })
  tagsets?: Tagset[];

  restrictedTagsetNames?: string[];

  // Constructor
  constructor() {
    super();
    this.restrictedTagsetNames = [RestrictedTagsetNames.Default];
  }

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  initialiseMembers(): Profile {
    if (!this.references) {
      this.references = [];
    }

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
