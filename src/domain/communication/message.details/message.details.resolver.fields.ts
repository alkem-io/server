import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MessageDetails } from './message.details.interface';
import { MessageParent } from './message.details.parent.interface';

@Resolver(() => MessageDetails)
export class MessageDetailsResolverFields {
  constructor() {}

  @ResolveField('parent', () => MessageParent, {
    nullable: false,
    description:
      'The parent entity that is using the room the message was sent in.',
  })
  public parent(@Parent() messageDetails: MessageDetails): MessageParent {
    return messageDetails.parent;
  }
}
