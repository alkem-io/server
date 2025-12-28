import { Field, ObjectType } from '@nestjs/graphql';
import { IRoom } from '@domain/communication/room/room.interface';
import { INameable } from '@domain/common/entity/nameable-entity';
import { ForumDiscussionPrivacy } from '@common/enums/forum.discussion.privacy';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { IForum } from '@platform/forum/forum.interface';

@ObjectType('Discussion')
export abstract class IDiscussion extends INameable {
  @Field(() => ForumDiscussionCategory, {
    description: 'The category assigned to this Discussion.',
  })
  category!: string;

  createdBy!: string;

  comments!: IRoom;

  @Field(() => ForumDiscussionPrivacy, {
    description:
      'Privacy mode for the Discussion. Note: this is not yet implemented in the authorization policy.',
  })
  privacy!: string;

  forum?: IForum;
}
