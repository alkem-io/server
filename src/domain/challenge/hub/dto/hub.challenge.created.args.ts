import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class ChallengeCreatedArgs {
  @Field(() => UUID, {
    description: 'The Hub to receive the Challenge from.',
    nullable: false,
  })
  hubID!: string;
}
