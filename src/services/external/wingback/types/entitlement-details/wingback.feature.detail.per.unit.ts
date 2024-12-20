import { WingbackFeatureDetails } from '../wingback.type.feature';

export type WingbackFeatureDetailPerUnit = {
  pricing_strategy: 'per_unit';
  /** Number of units purchased */
  contracted_unit_count: string;
  /** Name of the unit - seats, computers, slots, etc */
  unit_name: string;
  /** If reported - specifies the number of units used*/
  used_unit_count: string;
  /** Minimum number of units that is possible to purchase */
  minimum_units: string;
  /** Minimum number of units that is possible to purchase */
  maximum_units: string | null;
};

export const isWingbackFeatureDetailPerUnit = (
  detail: WingbackFeatureDetails
): detail is WingbackFeatureDetailPerUnit => {
  return detail.pricing_strategy === 'per_unit';
};
