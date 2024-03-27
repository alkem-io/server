import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { Field, ObjectType } from '@nestjs/graphql';
import { IRoom } from '../room/room.interface';
import { INameable } from '@domain/common/entity/nameable-entity';
import { CommunicationDiscussionPrivacy } from '@common/enums/communication.discussion.privacy';

@ObjectType('Discussion')
export abstract class IDiscussion extends INameable {
  @Field(() => DiscussionCategory, {
    description: 'The category assigned to this Discussion.',
  })
  category!: string;

  createdBy!: string;

  comments!: IRoom;

  @Field(() => CommunicationDiscussionPrivacy, {
    description:
      'Privacy mode for the Discussion. Note: this is not yet implemented in the authorization policy.',
  })
  privacy!: string;
}
