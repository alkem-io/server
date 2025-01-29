import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@InputType()
export class ConvertSubspaceToSpaceInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The subspace to be promoted to be a new Space. Note: the original Subspace will no longer exist after the conversion. ',
  })
  subspaceID!: string;
}
