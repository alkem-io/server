import { ArgsType, Field } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';

@ArgsType()
export class ChallengeCreatedArgs {
  @Field(() => UUID_NAMEID, {
    description: 'The Hub to receive the Challenge from.',
    nullable: false,
  })
  hubID!: string;
}
