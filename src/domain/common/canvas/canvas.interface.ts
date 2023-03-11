import { ICallout } from '@domain/collaboration/callout';
import { Field, ObjectType } from '@nestjs/graphql';
import JSON from 'graphql-type-json';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { INameable } from '../entity/nameable-entity/nameable.interface';
import { IProfile } from '../profile/profile.interface';

@ObjectType('Canvas')
export abstract class ICanvas extends INameable {
  profile!: IProfile;

  @Field(() => JSON, {
    description: 'The JSON representation of the Canvas.',
  })
  value?: string;

  // Expose the date at which the Canvas was created from parent entity
  @Field(() => Date)
  createdDate!: Date;

  createdBy!: string;

  checkout?: ICanvasCheckout;

  callout?: ICallout;
}
