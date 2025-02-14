import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RevokeLicensePlanFromSpace {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the LicensePlan to assign.',
  })
  licensePlanID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Space to assign the LicensePlan to.',
  })
  spaceID!: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The ID of the Licensing to use.',
  })
  licensingID?: string;
}
