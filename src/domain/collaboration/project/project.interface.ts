import { IAgreement } from '@domain/collaboration/agreement/agreement.interface';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';

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
