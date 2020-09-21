import { ITag } from './ITag';
import { IAgreement } from './IAgreement';

export interface IProject {
    id: number;
    name: string;
    description?: string;
    lifecyclePhase?: string;
    tags?: ITag[];
    agreements?: IAgreement[];
  }