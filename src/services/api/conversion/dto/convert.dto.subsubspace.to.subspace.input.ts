import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@InputType()
export class ConvertSubsubspaceToSubspaceInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description:
      'The subsubspace to be promoted. Note: the original Opportunity will no longer exist after the conversion. ',
  })
  opportunityID!: string;
}
