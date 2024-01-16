import { Field, ObjectType } from '@nestjs/graphql';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { WhiteboardContent } from '../scalars/scalar.whiteboard.content';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';

@ObjectType('Whiteboard')
export abstract class IWhiteboard extends INameable {
  @Field(() => WhiteboardContent, {
    description: 'The JSON representation of the Whiteboard.',
  })
  content?: string;

  @Field(() => ContentUpdatePolicy, {
    description: 'The policy governing who can update the Whiteboard content.',
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  // Expose the date at which the Whiteboard was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  // Expose the date at which the Whiteboard was last updated from parent entity
  @Field(() => Date)
  updatedDate!: Date;

  createdBy?: string;

  callout?: ICallout;
}
