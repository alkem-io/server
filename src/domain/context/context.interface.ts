import { IReference } from '@domain/reference/reference.interface';

export interface IContext {
  id: number;
  tagline?: string;
  background?: string;
  vision?: string;
  impact?: string;
  who?: string;
  references?: IReference[];
}
