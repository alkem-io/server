import { UserGroup, Tagset } from '../entities';

export interface ITaggable {
  tagsets?: Tagset[];
  restrictedTagsetNames?: string[];
}
