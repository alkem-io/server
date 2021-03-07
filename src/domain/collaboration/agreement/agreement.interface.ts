import { ITagset } from '@domain/common/tagset/tagset.interface';

export interface IAgreement {
  id: number;
  name: string;
  description?: string;
  tagsset?: ITagset;
}
