import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { ILicensePolicy } from '@platform/license-policy/license.policy.interface';

@ObjectType('Licensing')
export abstract class ILicensing extends IAuthorizable {
  plans?: ILicensePlan[];

  licensePolicy!: ILicensePolicy;
}
