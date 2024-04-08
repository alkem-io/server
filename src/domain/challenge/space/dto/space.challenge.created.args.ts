import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class SubspaceCreatedArgs {
  @Field(() => UUID, {
    description: 'The Space to receive the Subspaces from.',
    nullable: false,
  })
  journeyID!: string;
}
