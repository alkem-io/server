import { Field, ObjectType } from '@nestjs/graphql';
import { ILicenseManager } from '@platform/license-manager/license.manager.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';

@ObjectType('LicensePlan')
export abstract class ILicensePlan extends IBaseAlkemio {
  licenseManager?: ILicenseManager;

  @Field(() => String, {
    description: 'The name of the License Plan',
    nullable: false,
  })
  name!: string;

  @Field(() => Boolean, {
    description: 'Is this plan enabled?',
    nullable: false,
  })
  enabled!: boolean;
}
