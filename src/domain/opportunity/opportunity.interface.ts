import { IActorGroup } from '../actor-group/actor-group.interface';
import { IProfile } from '../profile/profile.interface';
import { IProject } from '../project/project.interface';

export interface IOpportunity {
  id: number;
  name: string;
  textID: string;
  state: string;
  projects?: IProject[];
  actorGroups?: IActorGroup[];
  profile: IProfile;
  restrictedActorGroupNames: string[];
}
