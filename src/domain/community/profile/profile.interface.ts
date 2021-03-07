import { IReference } from '@domain/common/reference/reference.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';

export interface IProfile {
  id: number;
  references?: IReference[];
  tagsets?: ITagset[];
  avatar: string;
  description: string;
  restrictedTagsetNames?: string[];
}
