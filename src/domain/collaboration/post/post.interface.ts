import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IRoom } from '@domain/communication/room/room.interface';

@ObjectType('Post')
export abstract class IPost extends INameable {
  @Field(() => String, {
    description:
      'The Post type, e.g. knowledge, idea, stakeholder persona etc.',
  })
  type!: string;

  createdBy!: string;

  @Field(() => IRoom, {
    nullable: false,
    description: 'The comments on this Post.',
  })
  comments!: IRoom;
}
