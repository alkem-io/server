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

  // Expose the date at which the post was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @Field(() => IRoom, {
    nullable: false,
    description: 'The comments on this Post.',
  })
  comments!: IRoom;
}
