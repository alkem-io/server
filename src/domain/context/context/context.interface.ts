import { IAspect, IEcosystemModel } from '@domain/context';
import { IReference } from '@domain/common/reference';
export interface IContext {
  id: number;
  tagline?: string;
  background?: string;
  vision?: string;
  impact?: string;
  who?: string;
  references?: IReference[];
  ecosystemModel?: IEcosystemModel;
  aspects?: IAspect[];
}
