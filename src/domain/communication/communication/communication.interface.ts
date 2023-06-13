import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IDiscussion } from '../discussion/discussion.interface';
import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { IRoom } from '../room/room.interface';

@ObjectType('Communication')
export abstract class ICommunication extends IAuthorizable {
  discussions?: IDiscussion[];

  @Field(() => IRoom, {
    nullable: false,
    description: 'The updates on this Communication.',
  })
  updates!: IRoom;

  hubID!: string;

  displayName!: string;

  @Field(() => [DiscussionCategory])
  discussionCategories!: string[];
}
