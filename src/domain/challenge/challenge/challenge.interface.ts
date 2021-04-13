import { IContext } from '@domain/context/context/context.interface';
import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ICommunity } from '@domain/community/community';
import { IOrganisation } from '@domain/community';
export interface IChallenge {
  id: number;
  name: string;
  textID: string;
  state: string;
  context?: IContext;
  community?: ICommunity;
  tagset?: ITagset;
  opportunities?: IOpportunity[];
  leadOrganisations?: IOrganisation[];
}
