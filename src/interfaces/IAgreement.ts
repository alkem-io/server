import { ITagset } from './ITagset';

export interface IAgreement {
  id: number;
  name: string;
  description?: string;
  tagset?: ITagset;
}
