import { WingbackFeature } from './wingback.feature';

export type WingbackEntitlement = {
  customer: {
    status: 'active';
  };
  contract: {
    contract_id: string;
    status: 'active';
  };
  plan: {
    name: string;
    slug: string;
    features: WingbackFeature[];
  };
};
