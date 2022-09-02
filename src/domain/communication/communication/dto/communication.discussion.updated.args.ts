import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class CommunicationDiscussionUpdatedArgs {
  @Field(() => UUID, {
    description: 'The Communication to receive Updates from.',
    nullable: false,
  })
  communicationID!: string;
}
