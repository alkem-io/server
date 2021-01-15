import { ITagset } from '@domain/tagset/tagset.interface';

export interface ITagsetable {
  tagsets?: ITagset[];
  restrictedTagsetNames?: string[];
}
