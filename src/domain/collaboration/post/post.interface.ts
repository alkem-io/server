import { Field, ObjectType } from '@nestjs/graphql';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { INameable } from '@domain/common/entity/nameable-entity/nameable.interface';
import { IRoom } from '@domain/communication/room/room.interface';

@ObjectType('Post')
export abstract class IPost extends INameable {
  @Field(() => String, {
    description:
      'The Post type, e.g. knowledge, idea, stakeholder persona etc.',
  })
  type!: string;

  @Field(() => ICallout, {
    nullable: true,
    description: 'The parent Callout of the Post',
  })
  callout?: ICallout;

  // Expose the date at which the post was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  @Field(() => IRoom, {
    nullable: false,
    description: 'The comments on this Post.',
  })
  comments!: IRoom;
}
