import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateSubspacePinnedInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the parent Space containing the subspace.',
  })
  spaceID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the subspace to pin or unpin.',
  })
  subspaceID!: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the subspace should be pinned (true) or unpinned (false).',
  })
  pinned!: boolean;
}
