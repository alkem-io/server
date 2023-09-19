import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';

@ObjectType('WhiteboardTemplate')
export abstract class IWhiteboardTemplate extends ITemplateBase {
  @Field(() => WhiteboardContent, {
    description: 'The visual content of the Whiteboard.',
  })
  content?: string;
}
