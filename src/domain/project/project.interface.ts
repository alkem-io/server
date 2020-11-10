import { IAgreement } from '../agreement/agreement.interface';
import { IAspect } from '../aspect/aspect.interface';
import { ITagset } from '../tagset/tagset.interface';

export interface IProject {
  id: number;
  textID: string;
  name: string;
  description?: string;
  state: string;
  tagset?: ITagset;
  agreements?: IAgreement[];
  aspects?: IAspect[];
}
