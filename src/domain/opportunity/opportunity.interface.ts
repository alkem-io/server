import { IAspect } from '../aspect/aspect.interface';
import { IProfile } from '../profile/profile.interface';
import { IProject } from '../project/project.interface';

export interface IOpportunity {
  id: number;
  name: string;
  textID: string;
  state: string;
  projects?: IProject[];
  profile: IProfile;
  aspects?: IAspect[];
}
