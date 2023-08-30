import { ICallout } from '@domain/collaboration/callout';
import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
import { INameable } from '../entity/nameable-entity/nameable.interface';

@ObjectType('WhiteboardRt')
export abstract class IWhiteboardRt extends INameable {
  @Field(() => JSON, {
    description: 'The JSON representation of the Whiteboard.',
  })
  value?: string;

  // Expose the date at which the Whiteboard was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy?: string;

  callout?: ICallout;
}
