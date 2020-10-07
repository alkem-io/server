import { IReference } from '../reference/reference.interface';
import { ITag } from '../tag/tag.interface';

export interface IContext {
  id: number;
  tagline?: string;
  background?: string;
  vision?: string;
  impact?: string;
  who?: string;
  references?: IReference[];
  tags?: ITag[];
}
