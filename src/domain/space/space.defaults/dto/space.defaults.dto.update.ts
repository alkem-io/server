import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class UpdateSpaceDefaultsInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the SpaceDefaults to be updated.',
  })
  spaceDefaultsID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The ID for the InnovationFlowtemplate to use for new Subspaces.',
  })
  flowTemplateID?: string;
}
