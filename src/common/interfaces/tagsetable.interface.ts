import { ITagset } from '@domain/common/tagset/tagset.interface';

export interface ITagsetable {
  tagsets?: ITagset[];
  restrictedTagsetNames?: string[];
}
