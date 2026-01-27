import { UUID } from '@domain/common/scalars';
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class SubspaceCreatedArgs {
  @Field(() => UUID, {
    description: 'The Space to receive the Subspaces from.',
    nullable: false,
  })
  spaceID!: string;
}
