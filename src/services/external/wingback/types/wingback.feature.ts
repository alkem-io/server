export type WingbackFeature = {
  name: string;
  slug: string;
  original_feature_id: string;
  entitlement_details: {
    pricing_strategy: WingbackPricingStrategy;
    unit_name: string;
    batch_size: unknown | null;
    flat_fee: unknown | null;
    contracted_unit_count: number;
    tiers: unknown[];
    used_unit_count: number;
  };
};

export type WingbackPricingStrategy = 'unit_tiered' | 'flat';
