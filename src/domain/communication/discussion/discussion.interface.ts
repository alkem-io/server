import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { Field, ObjectType } from '@nestjs/graphql';
import { IRoomableNameable } from '../room/roomable.nameable.interface';

@ObjectType('Discussion')
export abstract class IDiscussion extends IRoomableNameable {
  @Field(() => DiscussionCategory, {
    description: 'The category assigned to this Discussion.',
  })
  category!: string;

  createdBy!: string;

  @Field(() => Number, {
    description: 'The number of comments.',
  })
  commentsCount!: number;
}
