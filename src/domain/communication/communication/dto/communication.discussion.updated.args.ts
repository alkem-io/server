import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class CommunicationDiscussionUpdatedArgs {
  @Field(() => UUID, {
    description: 'The ID of the Communication to subscribe to all updates on.',
    nullable: false,
  })
  communicationID!: string;
}
