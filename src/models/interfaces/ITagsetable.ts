import { Tagset } from '../entities';

export interface ITagsetable {
  tagsets?: Tagset[];
  restrictedTagsetNames?: string[];
}
