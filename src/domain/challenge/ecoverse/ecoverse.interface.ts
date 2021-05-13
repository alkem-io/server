import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IContext } from '@domain/context/context/context.interface';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ICommunity } from '@domain/community/community';

export interface IEcoverse {
  id: number;
  name: string;
  textID: string;
  host?: IOrganisation;
  context?: IContext;
  community?: ICommunity;
  organisations?: IOrganisation[];
  challenges?: IChallenge[];
  tagset?: ITagset;
}
