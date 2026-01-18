import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { ForumDiscussionPrivacy } from '@common/enums/forum.discussion.privacy';
import { INameable } from '@domain/common/entity/nameable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IForum } from '@platform/forum/forum.interface';
import { IRoom } from '../../domain/communication/room/room.interface';

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
