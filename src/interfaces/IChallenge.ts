import { ITag } from './ITag';
import { IContext } from './IContext';

export interface IChallenge {
    id: number;
    name: string;
    context?: IContext;
    tags?: ITag[];
  }