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

  @Field(() => ContentUpdatePolicy, {
    description: 'The policy governing who can update the Whiteboard content.',
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  createdBy?: string;

  callout?: ICallout;
}
