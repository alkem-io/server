import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class CalloutMessageReceivedArgs {
  @Field(() => [UUID], {
    description: 'The Callouts to receive messages from.',
    nullable: false,
  })
  calloutIDs!: string[];
}
