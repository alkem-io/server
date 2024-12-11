import { Resolver } from '@nestjs/graphql';
import { ILicensePlan } from './license.plan.interface';

@Resolver(() => ILicensePlan)
export class LicensePlanResolverFields {
  constructor() {}
}
