import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Discussion')
export abstract class IDiscussion extends IAuthorizable {
  @Field(() => String, {
    description: 'The title of the Discussion.',
  })
  title!: string;

  @Field(() => DiscussionCategory, {
    description: 'The category assigned to this Discussion.',
  })
  category?: string;

  discussionRoomID!: string;
  communicationGroupID!: string;
}
