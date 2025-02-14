import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IRoom } from '@domain/communication/room/room.interface';

@ObjectType('Post')
export abstract class IPost extends INameable {
  createdBy!: string;

  @Field(() => IRoom, {
    nullable: false,
    description: 'The comments on this Post.',
  })
  comments!: IRoom;

  @Field(() => Date, {
    description: 'The date at which the entity was created.',
    nullable: false,
  })
  createdDate?: Date;
}
