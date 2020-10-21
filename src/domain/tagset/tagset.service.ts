import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ITagsetable } from 'src/interfaces/tagsetable.interface';
import { Repository } from 'typeorm';
import { RestrictedTagsetNames, Tagset } from './tagset.entity';
import { ITagset } from './tagset.interface';

@Injectable()
export class TagsetService {
  constructor(
    @InjectRepository(Tagset)
    private tagsetRepository: Repository<Tagset>
  ) {}

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(tagset: ITagset): Promise<ITagset> {
    if (!tagset.tags) {
      tagset.tags = [];
    }

    return tagset;
  }

  async getTagset(tagsetID: number): Promise<ITagset | undefined> {
    return Tagset.findOne({ id: tagsetID });
  }

  async replaceTags(tagsetID: number, newTags: string[]): Promise<ITagset> {
    const tagset = (await this.getTagset(tagsetID)) as Tagset;

    if (!tagset) throw new Error(`Tagset with id(${tagsetID}) not found!`);
    if (!newTags)
      throw new Error(`Unable to replace tags on tagset(${tagsetID}`);

    // Check the incoming tags and replace if not null
    tagset.tags = newTags;
    await this.tagsetRepository.save(tagset);

    return tagset;
  }

  async addTag(tagsetID: number, newTag: string): Promise<ITagset> {
    const tagset = (await this.getTagset(tagsetID)) as Tagset;

    if (!tagset) throw new Error(`Tagset with id(${tagsetID}) not found!`);
    if (!tagset.tags)
      throw new Error(`Tagset with id(${tagsetID}) not initialised!`);

    // Check if the tag already exists or not
    if (tagset.tags.includes(newTag)) {
      // Tag already exists; just return
      return tagset;
    }
    // Tag did not exist so add it
    tagset.tags?.push(newTag);
    await this.tagsetRepository.save(tagset);

    return tagset;
  }

  async createRestrictedTagsets(
    tagsetable: ITagsetable,
    names: string[]
  ): Promise<boolean> {
    if (!tagsetable.restrictedTagsetNames) {
      throw new Error('Non-initialised tagsetable submitted');
    }
    for (const name of names) {
      const tagset = new Tagset(name);
      this.initialiseMembers(tagset);
      tagsetable.tagsets?.push(tagset as ITagset);
    }
    return true;
  }

  // Get the default tagset
  defaultTagset(tagsetable: ITagsetable): ITagset | undefined {
    if (!tagsetable.tagsets) throw new Error('Tagsets not initialised');
    const defaultTagset = tagsetable.tagsets.find(
      t => t.name === RestrictedTagsetNames.Default
    );
    return defaultTagset;
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
      console.log(
        `Attempted to create a tagset using a restricted name: ${name}`
      );
      throw new Error(
        'Unable to create tagset with restricted name: ' + { name }
      );
    }

    const newTagset = new Tagset(name);
    this.initialiseMembers(newTagset as ITagset);
    tagsetable.tagsets?.push(newTagset as ITagset);
    return newTagset;
  }

  hasTag(tagset: ITagset, tagToCheck: string): boolean {
    for (const tag of tagset.tags) {
      if (tag === tagToCheck) return true;
    }
    return false;
  }
}
