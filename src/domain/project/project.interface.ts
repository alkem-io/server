import { IAgreement } from '../agreement/agreement.interface';
import { ITag } from '../tag/tag.interface';

export interface IProject {
  id: number;
  name: string;
  description?: string;
  lifecyclePhase?: string;
  tags?: ITag[];
  agreements?: IAgreement[];
}
