import { IContext } from '../context/context.interface';
import { IOpportunity } from '../opportunity/opportunity.interface';
import { IOrganisation } from '../organisation/organisation.interface';
import { ITagset } from '../tagset/tagset.interface';
import { IUserGroup } from '../user-group/user-group.interface';

export interface IChallenge {
  id: number;
  name: string;
  textID: string;
  state: string;
  context?: IContext;
  tagset?: ITagset;
  groups?: IUserGroup[];
  opportunities?: IOpportunity[];
  challengeLeads?: IOrganisation[];
  restrictedGroupNames: string[];
}
