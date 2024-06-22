import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';

@InputType()
export class ConvertSubspaceToSpaceInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description:
      'The subspace to be promoted to be a new Space. Note: the original Subspace will no longer exist after the conversion. ',
  })
  subspaceID!: string;
}
