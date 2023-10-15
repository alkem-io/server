import { Field, ObjectType } from '@nestjs/graphql';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { WhiteboardContent } from '../scalars/scalar.whiteboard.content';

@ObjectType('WhiteboardRt')
export abstract class IWhiteboardRt extends INameable {
  @Field(() => WhiteboardContent, {
    description: 'The JSON representation of the WhiteboardRt.',
  })
  content?: string;

  // Expose the date at which the WhiteboardRt was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  // Expose the date at which the WhiteboardRt was last updated from parent entity
  @Field(() => Date)
  updatedDate!: Date;

  createdBy?: string;

  callout?: ICallout;
}
