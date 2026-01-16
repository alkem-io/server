import { Field, Int, ObjectType } from '@nestjs/graphql';
import { MessageID } from '@domain/common/scalars';

@ObjectType('RoomThreadUnreadCount', {
  description: 'Unread message count for a specific thread in a Room.',
})
export class RoomThreadUnreadCount {
  @Field(() => MessageID, {
    nullable: false,
    description: 'The thread ID.',
  })
  threadId!: string;

  @Field(() => Int, {
    nullable: false,
    description: 'The number of unread messages in the thread.',
  })
  count!: number;
}

@ObjectType('RoomUnreadCounts', {
  description: 'Unread message counts for a Room.',
})
export class RoomUnreadCounts {
  @Field(() => Int, {
    nullable: false,
    description: 'The total number of unread messages in the Room.',
  })
  roomUnreadCount!: number;

  @Field(() => [RoomThreadUnreadCount], {
    nullable: true,
    description: 'Unread counts per thread, if thread IDs were requested.',
  })
  threadUnreadCounts?: RoomThreadUnreadCount[];
}
