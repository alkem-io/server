import { registerEnumType } from '@nestjs/graphql';

export enum LicensePlanType {
  SPACE_PLAN = 'space-plan',
  SPACE_FEATURE_FLAG = 'space-feature-flag',
}

registerEnumType(LicensePlanType, {
  name: 'LicensePlanType',
});
