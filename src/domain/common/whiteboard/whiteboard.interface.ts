import { ICallout } from '@domain/collaboration/callout';
import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
import { IWhiteboardCheckout } from '../whiteboard-checkout/whiteboard.checkout.interface';
import { INameable } from '../entity/nameable-entity/nameable.interface';

@ObjectType('Whiteboard')
export abstract class IWhiteboard extends INameable {
  @Field(() => JSON, {
    nullable: false,
    description: 'The visual content of the Whiteboard.',
  })
  content!: string;

  // Expose the date at which the Whiteboard was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy?: string;

  checkout?: IWhiteboardCheckout;

  callout?: ICallout;
}
