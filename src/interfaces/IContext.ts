import { ITagset } from './ITagset';
import { IReference } from './IReference';

export interface IContext {
  id: number;
  tagLine?: string;
  background?: string;
  vision?: string;
  impact?: string;
  who?: string;
  references?: IReference[];
  tagset?: ITagset;
}
