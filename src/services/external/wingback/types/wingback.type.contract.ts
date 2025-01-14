import { WingbackFeature } from '@services/external/wingback/types/wingback.type.feature';

export interface WingbackContract {
  contract_summary: ContractSummary;
  plan: WingbackPlan;
  discount: string | null;
  billing_information: BillingInformation;
}

export interface ContractSummary {
  id: string;
  plan: string;
  plan_internal_name: string;
  plan_external_name: string;
  plan_id: string;
  customer: string;
  customer_id: string;
  status: string;
  cycle: string;
  cycle_start_offset: number;
  strategy: string;
  currency: string;
  amount: number;
  created: string;
  activation: string;
  expiration: string | null;
  billing_information: {
    current_period: string | null;
    current_period_idx: number | null;
  };
  pricing_id: string | null;
  configuration: {
    automatic_payment: boolean;
    due_date_policy: string;
    usage_period_closing_policy: string;
    invoice_trigger: string;
  };
  free_cycles: number;
  free_trial_end: string;
  next_cycle_start: string;
  cost_estimates: {
    recurring_price: PriceDetails;
    one_time_price: PriceDetails;
    on_demand_price: PriceDetails;
    custom_cycle_charges: {
      periodic_daily: PriceDetails;
      periodic_weekly: PriceDetails;
      periodic_monthly: PriceDetails;
      periodic_quarterly: PriceDetails;
      periodic_yearly: PriceDetails;
    };
  };
}

export interface PriceDetails {
  cycle_start_charges: number;
  minimum_usage: number;
  extra_cycle_end_charges: number;
}

export interface WingbackPlan {
  id: string;
  original_plan_id: string;
  slug: string;
  name: string;
  internal_name: string;
  external_name: string;
  description: string;
  features: WingbackFeature[];
  strategy: string;
  price: string | null;
  free_trial_days: number;
}

export interface BillingInformation {
  current_period: string | null;
  current_period_idx: number | null;
}
