import { ITag } from './ITag';

export interface IChallenge {
    id: number;
    name: string;
    description: string;
    tags: ITag[];
  }