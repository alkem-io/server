import { IAgreement } from '../agreement/agreement.interface';
import { ITagset } from '../tagset/tagset.interface';

export interface IProject {
  id: number;
  name: string;
  description?: string;
  lifecyclePhase?: string;
  tagset: ITagset;
  agreements?: IAgreement[];
}
