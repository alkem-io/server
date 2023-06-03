import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { Field, ObjectType } from '@nestjs/graphql';
import { IRoom } from '../room/room.interface';
import { INameable } from '@domain/common/entity/nameable-entity';

@ObjectType('Discussion')
export abstract class IDiscussion extends INameable {
  @Field(() => DiscussionCategory, {
    description: 'The category assigned to this Discussion.',
  })
  category!: string;

  createdBy!: string;

  comments?: IRoom;
}
