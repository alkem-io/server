import { WingbackFeatureDetailPerUnit } from './entitlement-details/wingback.feature.detail.per.unit';

export type WingbackFeature = {
  name: string;
  /** a feature short name (nameID) */
  slug: string;
  original_feature_id: string;
  entitlement_details: WingbackFeatureDetails;
};

export type WingbackFeatureDetails =
  | WingbackFeatureDetailFlat
  | WingbackFeatureDetailPerUnit
  | WingbackFeatureDetailUsage
  | WingbackFeatureDetailUnitTiered
  | WingbackFeatureDetailUsageTiered;

export type WingbackFeatureDetailFlat = {
  pricing_strategy: 'flat';
};
export type WingbackFeatureDetailUsage = {
  pricing_strategy: 'usage';
  /**
   * Determines how overusage should be charged:
   * AllUsageOvercharge - when using over maximum amount, all usage is charged at overusage price
   * ExtraUsageOvercharge - when using over maximum amount, only the amount over maximum is charged at overusage price
   * */
  over_usage_charge_strategy: 'all_usage_overcharge' | 'extra_usage_overcharge';
  /** Name of the unit - CPU time, RAM, etc */
  unit_name: string;
};
export type WingbackFeatureDetailUnitTiered = {
  pricing_strategy: 'unit_tiered';
};
export type WingbackFeatureDetailUsageTiered = {
  pricing_strategy: 'usage_tiered';
};
