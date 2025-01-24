import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class ConvertSubsubspaceToSubspaceInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The subsubspace to be promoted. Note: the original Opportunity will no longer exist after the conversion. ',
  })
  subsubspaceID!: string;
}
