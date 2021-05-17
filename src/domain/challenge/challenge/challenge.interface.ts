import { IContext } from '@domain/context/context/context.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ICommunity } from '@domain/community/community';
import { IOrganisation } from '@domain/community';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
export interface IChallenge {
  id: number;
  name: string;
  textID: string;
  context?: IContext;
  community?: ICommunity;
  opportunity?: IOpportunity;
  lifecycle?: ILifecycle;
  tagset?: ITagset;
  childChallenges?: IChallenge[];
  leadOrganisations?: IOrganisation[];
  ecoverseID: string;
}
