import { IContext } from '@domain/context/context/context.interface';
import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Application } from '@domain/community/application/application.entity';

export interface IChallenge {
  id: number;
  name: string;
  textID: string;
  state: string;
  context?: IContext;
  tagset?: ITagset;
  groups?: IUserGroup[];
  opportunities?: IOpportunity[];
  leadOrganisations?: IOrganisation[];
  restrictedGroupNames: string[];
  applications?: Application[];
}
