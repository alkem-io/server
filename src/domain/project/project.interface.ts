import { IAgreement } from '@domain/agreement/agreement.interface';
import { IAspect } from '@domain/aspect/aspect.interface';
import { ITagset } from '@domain/tagset/tagset.interface';

export interface IProject {
  id: number;
  textID: string;
  name: string;
  description?: string;
  state?: string;
  tagset?: ITagset;
  agreements?: IAgreement[];
  aspects?: IAspect[];
}
