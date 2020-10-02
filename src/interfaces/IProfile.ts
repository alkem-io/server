import { IReference } from './IReference';

export interface IProfile {
  id: number;
  references?: IReference[];
}
