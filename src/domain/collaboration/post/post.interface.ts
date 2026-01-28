import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Post')
export abstract class IPost extends INameable {
  createdBy!: string;

  @Field(() => IRoom, {
    nullable: false,
    description: 'The comments on this Post.',
  })
  comments!: IRoom;
}
