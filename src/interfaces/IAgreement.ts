import { ITag } from './ITag';

export interface IAgreement {
  id: number;
  name: string;
  description?: string;
  tags?: ITag[];
}
