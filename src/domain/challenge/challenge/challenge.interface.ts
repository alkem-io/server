import { IContext } from '@domain/context/context/context.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ICommunity } from '@domain/community/community';
import { IOrganisation } from '@domain/community';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { ICollaboration } from '@domain/collaboration/collaboration';
export interface IChallenge {
  id: number;
  name: string;
  textID: string;
  context?: IContext;
  community?: ICommunity;
  collaboration?: ICollaboration;
  lifecycle?: ILifecycle;
  tagset?: ITagset;
  childChallenges?: IChallenge[];
  leadOrganisations?: IOrganisation[];
}
