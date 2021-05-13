import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';

export interface IEcoverse {
  id: number;
  textID: string;
  name: string;
  host?: IOrganisation;
  challenge?: IChallenge;
}
