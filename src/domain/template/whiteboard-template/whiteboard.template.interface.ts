import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';
import JSON from 'graphql-type-json';

@ObjectType('WhiteboardTemplate')
export abstract class IWhiteboardTemplate extends ITemplateBase {
  @Field(() => JSON, {
    description: 'The visual content of the Whiteboard.',
  })
  content?: string;
}
