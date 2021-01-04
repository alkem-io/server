import { IReference } from '@domain/reference/reference.interface';
import { ITagset } from '@domain/tagset/tagset.interface';

export interface IProfile {
  id: number;
  references?: IReference[];
  tagsets?: ITagset[];
  avatar: string;
  description: string;
  restrictedTagsetNames?: string[];
}
