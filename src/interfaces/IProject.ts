import { ITagset } from './ITagset';
import { IAgreement } from './IAgreement';

export interface IProject {
  id: number;
  name: string;
  description?: string;
  lifecyclePhase?: string;
  tagset?: ITagset;
  agreements?: IAgreement[];
}
