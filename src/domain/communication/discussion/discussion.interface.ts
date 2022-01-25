import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { Field, ObjectType } from '@nestjs/graphql';
import { IRoomable } from '../room/roomable.interface';

@ObjectType('Discussion')
export abstract class IDiscussion extends IRoomable {
  @Field(() => String, {
    description: 'The title of the Discussion.',
  })
  title!: string;

  @Field(() => String, {
    description: 'The description of this Discussion.',
  })
  description!: string;

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
