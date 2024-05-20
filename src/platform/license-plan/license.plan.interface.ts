import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { ILicensing } from '@platform/licensing/licensing.interface';

@ObjectType('LicensePlan')
export abstract class ILicensePlan extends IBaseAlkemio {
  licensing?: ILicensing;

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
