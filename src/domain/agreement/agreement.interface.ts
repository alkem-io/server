import { ITagset } from '@domain/tagset/tagset.interface';

export interface IAgreement {
  id: number;
  name: string;
  description?: string;
  tagsset?: ITagset;
}
