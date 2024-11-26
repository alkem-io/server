import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { ILicensePolicy } from '@platform/licensing/credential-based/license-policy/license.policy.interface';

@ObjectType('Licensing')
export abstract class ILicensingFramework extends IAuthorizable {
  plans!: ILicensePlan[];

  licensePolicy!: ILicensePolicy;
}
