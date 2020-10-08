import { Injectable } from '@nestjs/common';
import { ITagsetable } from 'src/interfaces/tagsetable.interface';
import { RestrictedTagsetNames, Tagset } from './tagset.entity';
import { ITagset } from './tagset.interface';

@Injectable()
export class TagsetService {

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(tagset: ITagset): Promise<ITagset> {
    if (!tagset.tags) {
      tagset.tags = [];
    }

    return tagset;
  }

  async createRestrictedTagsets(tagsetable: ITagsetable, names: string[]): Promise<boolean> {
    if (!tagsetable.restrictedTagsetNames) {
      throw new Error('Non-initialised tagsetable submitted');
    }
    for (const name of names) {
      const tagset = new Tagset(name);
      this.initialiseMembers(tagsetable as ITagset);
      tagsetable.tagsets?.push(tagsetable as ITagset);
    }
    return true;
  }

  // Get the default tagset
  defaultTagset(tagsetable: ITagsetable): ITagset {
    if (!tagsetable.tagsets) throw new Error('Tagsets not initialised');
    for (const tagset of tagsetable.tagsets) {
      if (tagset.name === RestrictedTagsetNames.Default) {
        return tagset;
      }
   }
    throw new Error('Unable to find default tagset');
  }

  hasTagsetWithName(tagsetable: ITagsetable, name: string): boolean {
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

  getTagsetByName(tagsetable: ITagsetable, name: string): ITagset {
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

  addTagsetWithName(tagsetable: ITagsetable, name: string): ITagset {
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
    this.initialiseMembers(newTagset as ITagset);
    tagsetable.tagsets?.push(newTagset as ITagset);
    return newTagset;
  }
}
