import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateAccountDefaultsInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the Account whose Defaults are to be updated.',
  })
  accountID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The ID for the InnovationFlowtemplate to use for new Challenges and Opportunities.',
  })
  flowTemplateID?: string;
}
