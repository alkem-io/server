import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IContext } from '@domain/context/context/context.interface';
import { IDID } from '@domain/agent/did/did.interface';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ICommunity } from '@domain/community/community';

export interface IEcoverse {
  id: number;
  name: string;
  host?: IOrganisation;
  context?: IContext;
  community?: ICommunity;
  DID: IDID;
  organisations?: IOrganisation[];
  challenges?: IChallenge[];
  tagset?: ITagset;
}
