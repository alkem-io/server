import { IContext } from '@domain/context/context.interface';
import { IOpportunity } from '@domain/opportunity/opportunity.interface';
import { IOrganisation } from '@domain/organisation/organisation.interface';
import { ITagset } from '@domain/tagset/tagset.interface';
import { IUserGroup } from '@domain/user-group/user-group.interface';

export interface IChallenge {
  id: number;
  name: string;
  textID: string;
  state?: string | null;
  context?: IContext;
  tagset?: ITagset;
  groups?: IUserGroup[];
  opportunities?: IOpportunity[];
  leadOrganisations?: IOrganisation[];
  restrictedGroupNames: string[];
}
