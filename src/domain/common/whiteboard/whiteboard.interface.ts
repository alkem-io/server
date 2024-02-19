import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { WhiteboardContent } from '../scalars/scalar.whiteboard.content';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';

@ObjectType('Whiteboard')
export abstract class IWhiteboard extends INameable {
  @Field(() => WhiteboardContent, {
    nullable: false,
    description: 'The visual content of the Whiteboard.',
  })
  content!: string;

  // Expose the date at which the Whiteboard was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy?: string;

  callout?: ICallout;

  contentUpdatePolicy!: ContentUpdatePolicy;
}
