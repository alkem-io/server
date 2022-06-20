import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplateBase } from '../template-base/template.base.interface';
import JSON from 'graphql-type-json';

@ObjectType('CanvasTemplate')
export abstract class ICanvasTemplate extends ITemplateBase {
  @Field(() => JSON, {
    description: 'The JSON representation of the Canvas.',
  })
  value?: string;
}
