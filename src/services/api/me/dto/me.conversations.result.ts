import { ObjectType, Field } from '@nestjs/graphql';
import { IConversation } from '@domain/communication/conversation/conversation.interface';

@ObjectType('MeConversationsResult')
export class MeConversationsResult {
  @Field(() => [IConversation], {
    nullable: false,
    description: 'Conversations between users.',
  })
  users!: IConversation[];

  @Field(() => [IConversation], {
    nullable: false,
    description: 'Conversations between users and virtual contributors.',
  })
  virtualContributors!: IConversation[];
}
